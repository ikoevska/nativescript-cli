///<reference path="../.d.ts"/>

import path = require("path");
import util = require("util");
import constants = require("./../constants");
import helpers = require("./../common/helpers");
import options = require("./../options");

export class PostInstallCommand implements ICommand {
	private static PACKAGE_URL = "https://s3.amazonaws.com/nativescript/ios/%s/libTNSBridge.zip";

	constructor(private $httpClient: Server.IHttpClient,
		private $fs: IFileSystem,
		private $versioningService: IVersioningService) { }

	public execute(args:string[]): IFuture<void> {
		return (() => {
			if(helpers.isDarwin()) {
				var frameworkVersionDirectoryPath = this.$versioningService.getCachedFrameworkDirectory().wait();
				if(!this.$fs.exists(frameworkVersionDirectoryPath).wait()) {
					this.$fs.createDirectory(frameworkVersionDirectoryPath).wait();

					var filePath = path.join(frameworkVersionDirectoryPath, constants.IOS_BRIDGE_FILE_NAME);

					var file = this.$fs.createWriteStream(filePath);
					var fileEnd = this.$fs.futureFromEvent(file, "finish");

					var url = util.format(PostInstallCommand.PACKAGE_URL, this.$versioningService.getLatestFrameworkVersion().wait());

					this.$httpClient.httpRequest({ url: url, pipeTo: file }).wait();
					fileEnd.wait();

					this.$fs.unzip(filePath, frameworkVersionDirectoryPath).wait();
				}
			}
		}).future<void>()();
	}
}
$injector.registerCommand("dev-post-install", PostInstallCommand);