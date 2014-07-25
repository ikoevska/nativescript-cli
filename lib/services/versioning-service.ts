///<reference path="../.d.ts"/>
import path = require("path");
import options = require("./../options");

export class VersioningService  implements  IVersioningService {
	private static NPM_REGISTRY_ENDPOINT = "http://registry.npmjs.org/tns-ios";

	private latestVersion;
	private cachedFrameworkFolder;

	constructor(private $fs: IFileSystem,
		private $httpClient: Server.IHttpClient) { }

	public getCachedFrameworkDirectory(): IFuture<string> {
		return (() => {
			if(!this.cachedFrameworkFolder) {
				var latestFrameworkVersion = this.getLatestFrameworkVersion().wait();

				var cacheDirectoryPath = path.join(options["profile-dir"], "tns-ios");
				this.$fs.ensureDirectoryExists(cacheDirectoryPath).wait();

				this.cachedFrameworkFolder = path.join(cacheDirectoryPath, latestFrameworkVersion);
			}

			return this.cachedFrameworkFolder;
		}).future<string>()();
	}

	public getLatestFrameworkVersion(): IFuture<string> {
		return (() => {
			if(!this.latestVersion) {
				var response = this.$httpClient.httpRequest(VersioningService.NPM_REGISTRY_ENDPOINT).wait().body;
				this.latestVersion = JSON.parse(response)["dist-tags"].latest;
			}

			return this.latestVersion;
		}).future<string>()();
	}
}
$injector.register("versioningService", VersioningService);