import { Init, Singleton } from '../decorators/definitions.decorator';
import { Autowired } from '../decorators/autowired.decorator';
import {
  HandlerFunction,
  IApplicationContext,
  JoinPoint,
  MethodDecoratorMetaData,
  MethodHandlerFunction,
  ParameterDecoratorMetaData,
  ParameterHandlerFunction,
  PipeTransform,
  PipeUnionTransform,
} from '../interface';
import { AspectService } from './aspect.service';
import {
  ALL,
  APPLICATION_CONTEXT_KEY,
  CONFIG_KEY,
  getClassMetadata,
  getMethodParamTypes,
  INJECT_CUSTOM_METHOD,
  INJECT_CUSTOM_PARAM,
  transformTypeFromTSDesign,
} from '../decorators/decorator.manager';
import { isClass } from '../utils/types.util';
import { CommonError, ParameterError } from '../error/framework';
import { ConfigService } from './config.service';

@Singleton()
export class DecoratorService {
  private propertyHandlerMap = new Map<string, HandlerFunction>();
  private methodDecoratorMap: Map<string, (...args) => any> = new Map();
  private parameterDecoratorMap: Map<string, (...args) => any> = new Map();
  private parameterDecoratorPipes: Map<string, PipeUnionTransform[]> =
    new Map();

  @Autowired()
  private aspectService: AspectService;

  @Autowired()
  private configService: ConfigService;

  constructor(readonly applicationContext: IApplicationContext) {}

  @Init()
  protected init() {
    // add custom method decorator listener
    this.applicationContext.onBeforeBind(Clzz => {
      // find custom method decorator metadata, include method decorator information array
      const methodDecoratorMetadataList: MethodDecoratorMetaData[] =
        getClassMetadata(INJECT_CUSTOM_METHOD, Clzz);

      if (methodDecoratorMetadataList) {
        // loop it, save this order for decorator run
        for (const meta of methodDecoratorMetadataList) {
          const { propertyName, key, metadata, options } = meta;
          if (!options || !options.impl) {
            continue;
          }
          // add aspect implementation first
          this.aspectService.interceptPrototypeMethod(
            Clzz,
            propertyName,
            () => {
              const methodDecoratorHandler = this.methodDecoratorMap.get(key);
              if (!methodDecoratorHandler) {
                throw new CommonError(
                  `Method Decorator "${key}" handler not found, please register first.`
                );
              }
              return methodDecoratorHandler({
                target: Clzz,
                propertyName,
                metadata,
              });
            }
          );
        }
      }

      // find custom param decorator metadata
      const parameterDecoratorMetadata: {
        [methodName: string]: Array<ParameterDecoratorMetaData>;
      } = getClassMetadata(INJECT_CUSTOM_PARAM, Clzz);

      if (parameterDecoratorMetadata) {
        // loop it, save this order for decorator run
        for (const methodName of Object.keys(parameterDecoratorMetadata)) {
          // add aspect implementation first
          this.aspectService.interceptPrototypeMethod(Clzz, methodName, () => {
            return {
              before: async (joinPoint: JoinPoint) => {
                // joinPoint.args
                const newArgs = [...joinPoint.args];
                for (const meta of parameterDecoratorMetadata[methodName]) {
                  const {
                    propertyName,
                    key,
                    metadata,
                    parameterIndex,
                    options,
                  } = meta;

                  let parameterDecoratorHandler;
                  if (options && options.impl) {
                    parameterDecoratorHandler =
                      this.parameterDecoratorMap.get(key);
                    if (!parameterDecoratorHandler) {
                      throw new CommonError(
                        `Parameter Decorator "${key}" handler not found, please register first.`
                      );
                    }
                  } else {
                    // set default handler
                    parameterDecoratorHandler = async ({
                      parameterIndex,
                      originArgs,
                    }) => {
                      return originArgs[parameterIndex];
                    };
                  }

                  const paramTypes = getMethodParamTypes(Clzz, propertyName);
                  let skipPipes = false;
                  try {
                    newArgs[parameterIndex] = await parameterDecoratorHandler({
                      metadata,
                      propertyName,
                      parameterIndex,
                      target: Clzz,
                      originArgs: newArgs,
                      originParamType: paramTypes[parameterIndex],
                    });
                  } catch (err) {
                    skipPipes = true;
                    if (options?.throwError === true) {
                      throw err;
                    }
                  }

                  if (skipPipes) {
                    continue;
                  }

                  const pipes = [
                    ...(this.parameterDecoratorPipes.get(key) || []),
                    ...(options?.pipes || []),
                  ];
                  for (const pipe of pipes) {
                    let transform;
                    if ('transform' in pipe) {
                      transform = pipe['transform'].bind(pipe);
                    } else if (isClass(pipe)) {
                      const ins =
                        await this.applicationContext.getAsync<PipeTransform>(
                          pipe as any
                        );
                      transform = ins.transform.bind(ins);
                    } else if (typeof pipe === 'function') {
                      transform = pipe;
                    } else {
                      throw new ParameterError(
                        'Pipe must be a function or implement PipeTransform interface'
                      );
                    }
                    newArgs[parameterIndex] = await transform(
                      newArgs[parameterIndex],
                      {
                        metaType: transformTypeFromTSDesign(
                          paramTypes[parameterIndex]
                        ),
                        metadata,
                        target: joinPoint.target,
                        methodName: joinPoint.methodName,
                      }
                    );
                  }
                }
                joinPoint.args = newArgs;
              },
            };
          });
        }
      }
    });

    // add custom property decorator listener
    this.applicationContext.onObjectCreated((instance, options) => {
      if (
        this.propertyHandlerMap.size > 0 &&
        Array.isArray(options.definition.handlerProps)
      ) {
        // has bind in container
        for (const item of options.definition.handlerProps) {
          this.defineGetterPropertyValue(
            item,
            instance,
            this.getHandler(item.key)
          );
        }
      }
    });

    // register @ApplicationContext
    this.registerPropertyHandler(
      APPLICATION_CONTEXT_KEY,
      (propertyName, mete) => {
        return this.applicationContext;
      }
    );

    // register @Config decorator handler
    this.registerPropertyHandler(CONFIG_KEY, (propertyName, meta) => {
      if (meta.identifier === ALL) {
        return this.configService.getConfiguration();
      } else {
        return this.configService.getConfiguration(
          meta.identifier ?? propertyName
        );
      }
    });
  }

  public registerPropertyHandler(decoratorKey: string, fn: HandlerFunction) {
    this.propertyHandlerMap.set(decoratorKey, fn);
  }

  public registerMethodHandler(
    decoratorKey: string,
    fn: MethodHandlerFunction
  ) {
    this.methodDecoratorMap.set(decoratorKey, fn);
  }

  public registerParameterHandler(
    decoratorKey: string,
    fn: ParameterHandlerFunction
  ) {
    this.parameterDecoratorMap.set(decoratorKey, fn);
  }

  public registerParameterPipes(
    decoratorKey: string,
    pipes: PipeUnionTransform[]
  ) {
    if (!this.parameterDecoratorPipes.has(decoratorKey)) {
      this.parameterDecoratorPipes.set(decoratorKey, []);
    }
    this.parameterDecoratorPipes.set(
      decoratorKey,
      this.parameterDecoratorPipes.get(decoratorKey).concat(pipes)
    );
  }

  /**
   * binding getter method for decorator
   *
   * @param prop
   * @param instance
   * @param getterHandler
   */
  private defineGetterPropertyValue(prop, instance, getterHandler) {
    if (prop && getterHandler) {
      if (prop.propertyName) {
        Object.defineProperty(instance, prop.propertyName, {
          get: () =>
            getterHandler(prop.propertyName, prop.metadata ?? {}, instance),
          configurable: true, // 继承对象有可能会有相同属性，这里需要配置成 true
          enumerable: true,
        });
      }
    }
  }

  private getHandler(key: string) {
    if (this.propertyHandlerMap.has(key)) {
      return this.propertyHandlerMap.get(key);
    }
  }
}
