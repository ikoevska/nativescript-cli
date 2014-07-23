///<reference path="../.d.ts"/>

import path = require("path");
import util = require("util");
import helpers = require("./../common/helpers");
import options = require("./../options");

export class PostInstallCommand implements ICommand {
	private static PACKAGE_URL = "https://s3.amazonaws.com/nativescript/ios/%s/libTNSBridge.zip";
	private static NPM_REGISTRY_ENDPOINT = "http://registry.npmjs.org/tns-ios";
	private static BRIDGE_FILE_NAME = "libTNSBridge";

	constructor(private $httpClient: Server.IHttpClient,
		private $fs: IFileSystem) { }

	public execute(args:string[]): IFuture<void> {
		return (() => {
			if(helpers.isDarwin()) {
				// TODO: Implement semantic versioning
				var latestFrameworkVersion = this.getLatestFrameworkVersion().wait();
				var url = util.format(PostInstallCommand.PACKAGE_URL, latestFrameworkVersion);

				var cacheDirectoryPath = path.join(options["profile-dir"], "tns-ios");
				this.$fs.ensureDirectoryExists(cacheDirectoryPath).wait();

				var frameworkVersionDirectoryPath = path.join(cacheDirectoryPath, latestFrameworkVersion);
				if(!this.$fs.exists(frameworkVersionDirectoryPath).wait()) {
					this.$fs.createDirectory(frameworkVersionDirectoryPath).wait();

					var filePath = path.join(frameworkVersionDirectoryPath, PostInstallCommand.BRIDGE_FILE_NAME);

					var file = this.$fs.createWriteStream(filePath);
					var fileEnd = this.$fs.futureFromEvent(file, "finish");

					this.$httpClient.httpRequest({ url: url, pipeTo: file }).wait();
					fileEnd.wait();

					this.$fs.unzip(filePath, frameworkVersionDirectoryPath).wait();
				}
			}
		}).future<void>()();
	}

	private getLatestFrameworkVersion(): IFuture<string> {
		return (() => {
			var response = this.$httpClient.httpRequest(PostInstallCommand.NPM_REGISTRY_ENDPOINT).wait().body;
			var latestVersion = JSON.parse(response)["dist-tags"].latest;

			return latestVersion;
		}).future<string>()();
	}
}
$injector.registerCommand("dev-post-install", PostInstallCommand);