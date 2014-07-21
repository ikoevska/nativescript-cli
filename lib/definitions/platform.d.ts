interface IPlatformService {
	addPlatforms(platforms: string[]): IFuture<void>;
	getInstalledPlatforms(): IFuture<string[]>;
	getAvailablePlatforms(): IFuture<string[]>;
	runPlatform(platform: string): IFuture<void>;
	preparePlatform(platform: string): IFuture<void>;
	buildPlatform(platform: string): IFuture<void>;
	deploy(platform: string): IFuture<void>;
}

interface IPlatformData {
	frameworkPackageName: string;
	platformProjectService: IPlatformSpecificProjectService;
	normalizedPlatformName: string;
	packageExtName: string;
	projectRoot: string;
	buildOutputPath: string;
	targetedOS?: string[];
}

interface IPlatformsData {
	platformsNames: string[];
	getPlatformData(platform: string): IPlatformData;
}

