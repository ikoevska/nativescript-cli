interface IProjectService {
	createProject(projectName: string, projectId: string): IFuture<void>;
	ensureProject(): void;
}

interface IProjectData {
	projectDir: string;
	projectName: string;
	platformsDir: string;
	projectFilePath: string;
	projectId?: string;
}

interface IProjectTemplatesService {
	defaultTemplatePath: IFuture<string>;
}

interface IPlatformProjectService {
	validate(): IFuture<void>;
	createProject(projectRoot: string, frameworkDir: string): IFuture<void>;
	interpolateData(projectRoot: string): IFuture<void>;
	afterCreateProject(projectRoot: string): IFuture<void>;
	getPreparedProjectLocation(projectRoot: string, normalizedPlatformName: string): IFuture<string>;
	buildProject(projectRoot: string): IFuture<void>;
}