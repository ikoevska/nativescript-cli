///<reference path="../.d.ts"/>

import path = require("path");
import shell = require("shelljs");
import util = require("util");
import constants = require("./../constants");
import helpers = require("./../common/helpers");

class PlatformsData implements IPlatformsData {
	private platformsData = {};

	constructor($projectData: IProjectData,
		$androidProjectService: IPlatformProjectService,
		$iOSProjectService: IPlatformProjectService) {

		this.platformsData = {
			ios: {
				frameworkPackageName: "tns-ios",
				normalizedPlatformName: "iOS",
				platformProjectService: $iOSProjectService,
				projectRoot: path.join($projectData.platformsDir, "ios"),
				targetedOS: ['darwin']
			},
			android: {
				frameworkPackageName: "tns-android",
				normalizedPlatformName: "Android",
				platformProjectService: $androidProjectService,
				projectRoot: path.join($projectData.platformsDir, "android")
			}
		}
	}

	public get platformsNames() {
		return Object.keys(this.platformsData);
	}

	public getPlatformData(platform): IPlatformData {
		return this.platformsData[platform];
	}
}
$injector.register("platformsData", PlatformsData);

export class PlatformService implements IPlatformService {
	constructor(private $errors: IErrors,
		private $fs: IFileSystem,
		private $logger: ILogger,
		private $npm: INodePackageManager,
		private $projectService: IProjectService,
		private $projectData: IProjectData,
		private $platformsData: IPlatformsData) {
	}

	public addPlatforms(platforms: string[]): IFuture<void> {
		return (() => {
			if(!platforms || platforms.length === 0) {
				this.$errors.fail("No platform specified. Please specify a platform to add");
			}

			this.$projectService.ensureProject();

			var platformsDir = this.$projectData.platformsDir;
			this.$fs.ensureDirectoryExists(platformsDir).wait();

			_.each(platforms, platform => {
				this.addPlatform(platform.toLowerCase()).wait();
			});

		}).future<void>()();
	}

	private addPlatform(platform: string): IFuture<void> {
		return(() => {
			platform = platform.split("@")[0];

			this.validatePlatform(platform);

			var platformPath = path.join(this.$projectData.platformsDir, platform);

			// TODO: Check for version compatability if the platform is in format platform@version. This should be done in PR for semanting versioning

			if (this.$fs.exists(platformPath).wait()) {
				this.$errors.fail("Platform %s already added", platform);
			}

			// Copy platform specific files in platforms dir
			var platformData = this.$platformsData.getPlatformData(platform);
			var platformProjectService = platformData.platformProjectService;

			platformProjectService.validate().wait();

			// Log the values for project
			this.$logger.trace("Creating NativeScript project for the %s platform", platform);
			this.$logger.trace("Path: %s", platformData.projectRoot);
			this.$logger.trace("Package: %s", this.$projectData.projectId);
			this.$logger.trace("Name: %s", this.$projectData.projectName);

			this.$logger.out("Copying template files...");

			// get path to downloaded framework package
			var frameworkDir = this.$npm.install(this.$platformsData.getPlatformData(platform).frameworkPackageName,
				path.join(this.$projectData.platformsDir, platform)).wait();
			frameworkDir = path.join(frameworkDir, constants.PROJECT_FRAMEWORK_FOLDER_NAME);

			platformProjectService.createProject(platformData.projectRoot, frameworkDir).wait();

			// Need to remove unneeded node_modules folder
			this.$fs.deleteDirectory(path.join("../", frameworkDir)).wait();

			platformProjectService.interpolateData(platformData.projectRoot).wait();
			platformProjectService.afterCreateProject(platformData.projectRoot).wait();

			this.$logger.out("Project successfully created.");

		}).future<void>()();
	}

	public getInstalledPlatforms(): IFuture<string[]> {
		return(() => {
			if(!this.$fs.exists(this.$projectData.platformsDir).wait()) {
				return [];
			}

			var subDirs = this.$fs.readDirectory(this.$projectData.platformsDir).wait();
			return _.filter(subDirs, p => this.$platformsData.platformsNames.indexOf(p) > -1);
		}).future<string[]>()();
	}

	public getAvailablePlatforms(): IFuture<string[]> {
		return (() => {
			var installedPlatforms = this.getInstalledPlatforms().wait();
			return _.filter(this.$platformsData.platformsNames, p => {
				return installedPlatforms.indexOf(p) < 0 && this.isPlatformSupportedForOS(p); // Only those not already installed
			});
		}).future<string[]>()();
	}

	public preparePlatform(platform: string): IFuture<void> {
		return (() => {
			platform = platform.toLowerCase();
			this.validatePlatform(platform);

			var platformData = this.$platformsData.getPlatformData(platform);
			var platformProjectService = platformData.platformProjectService;

			var appFilesLocation = platformProjectService.getPreparedProjectLocation(platformData.projectRoot, platformData.normalizedPlatformName).wait();
			var files = helpers.enumerateFilesInDirectorySync(appFilesLocation);

			var platformsAsString = this.$platformsData.platformsNames.join("|");

			_.each(files, fileName => {
				var platformInfo = PlatformService.parsePlatformSpecificFileName(path.basename(fileName), platformsAsString);
				var shouldExcludeFile = platformInfo && platformInfo.platform !== platform;
				if (shouldExcludeFile) {
					this.$fs.deleteFile(fileName).wait();
				} else if (platformInfo && platformInfo.onDeviceName) {
					this.$fs.rename(fileName, path.join(path.dirname(fileName), platformInfo.onDeviceName)).wait();
				}
			});

		}).future<void>()();
	}

	public buildPlatform(platform: string): IFuture<void> {
		return (() => {
			platform = platform.toLocaleLowerCase();
			this.validatePlatform(platform);

			var platformData = this.$platformsData.getPlatformData(platform);
			platformData.platformProjectService.buildProject(platformData.projectRoot).wait();
			this.$logger.out("Project successfully built");
		}).future<void>()();
	}

	public runPlatform(platform: string): IFuture<void> {
		return (() => {

		}).future<void>()();
	}

	private validatePlatform(platform: string): void {
		if (!this.isValidPlatform(platform)) {
			this.$errors.fail("Invalid platform %s. Valid platforms are %s.", platform, helpers.formatListOfNames(this.$platformsData.platformsNames));
		}

		if (!this.isPlatformSupportedForOS(platform)) {
			this.$errors.fail("Applications for platform %s can not be built on this OS - %s", platform, process.platform);
		}
	}

	private isValidPlatform(platform: string) {
		return this.$platformsData.getPlatformData(platform);
	}

	private isPlatformSupportedForOS(platform: string): boolean {
		var targetedOS = this.$platformsData.getPlatformData(platform).targetedOS;

		if(!targetedOS || targetedOS.indexOf("*") >= 0 || targetedOS.indexOf(process.platform) >= 0) {
			return true;
		}

		return false;
	}

	private static parsePlatformSpecificFileName(fileName: string, platforms: string): any {
		var regex = util.format("^(.+?)\.(%s)(\..+?)$", platforms);
		var parsed = fileName.toLowerCase().match(new RegExp(regex, "i"));
		if (parsed) {
			return {
				platform: parsed[2],
				onDeviceName: parsed[1] + parsed[3]
			};
		}
		return undefined;
	}
}
$injector.register("platformService", PlatformService);
