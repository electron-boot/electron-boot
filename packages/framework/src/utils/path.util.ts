export function getModuleRequirePathList(moduleName: string): string[] {
  const moduleNameList = [moduleName, moduleName.replace(/\//g, "_")];
  let moduleNameMap: {
    [key: string]: any;
  } = {};
  const modulePathList: string[] = [];
  Object.keys(require.cache || {}).forEach((moduleName) => {
    let moduleIndex = -1;
    for (const moduleName of moduleNameList) {
      const index = moduleName.indexOf(moduleName);
      if (index !== -1) {
        moduleIndex = index;
        break;
      }
    }
    if (moduleIndex === -1) {
      return;
    }
    const modulePath = moduleName.slice(0, moduleIndex);
    if (moduleNameMap[modulePath]) {
      return;
    }
    moduleNameMap[modulePath] = true;
    modulePathList.push(modulePath);
  });
  moduleNameMap = {};
  return modulePathList;
}
