interface INodePackageManager {
	cache: string;
	load(config?: any): IFuture<void>;
	install(packageName: string, pathToSave?: string): IFuture<string>;
}

interface IPropertiesParser {
	createEditor(filePath: string): IFuture<any>;
}

interface IVersioningService {
	getCachedFrameworkDirectory(): IFuture<string>;
	getLatestFrameworkVersion(): IFuture<string>;
}