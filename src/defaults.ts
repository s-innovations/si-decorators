
 
function isDefined(obj: any) {
    return !(typeof obj === "undefined" || obj === null);
}

declare type ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;

export type Factory<T> = {
    [P in keyof T]?: (o?:T) => T[P];
};

export interface Constructor<T> {
    new(): T;
    name?: string;
}
export interface Constructor1<T,TArg> {
    new(a:TArg): T;
    name?: string;
}
 
function setDefaultProperties(obj: any, props: any, defaults: any, mapper?: any) {
    for (var key in defaults) {
        let value = isDefined(props[key]) ? props[key] : defaults[key]();
        obj[key] = mapper && mapper[key] ? mapper[key](value) : value;   
    }
}

export type ConstructorFunc<T> = new (...args: any[]) => T;
export interface Base {
}

//export function defaults<T, TOptions>(options: Factory<Partial<TOptions>>, setDefaultsOnInstance?:boolean)
export function defaults<T extends Base, TOptions,TArg>(options: Factory<Partial<TOptions>>, setDefaultsOnInstance=false, debug=false) {
    return (target: Constructor<T> | Constructor1<T, Partial<TOptions>>) => {
        // save a reference to the original constructor
        var original = target;

        //// a utility function to generate instances of a class
        //function construct(constructor: Constructor<T> | Constructor1<T, TOptions>, args: any[]) {
        //    var c: any = function () {
        //        return constructor.apply(this, args);
        //    }
        //    c.prototype = constructor.prototype;
        //    return new c();
           
        //}

        //// the new constructor behaviour
        //var f: any = function (...args: any[]) {
        //    console.log("New: " + original.name);

        //    args[0] = args[0] || {};
        //    for (let key in options) {
        //        args[0][key] = isDefined(args[0][key]) ? args[0][key] : options[key]();
        //    }

        //    let instance = construct(original, args);
        //    if (setDefaultsOnInstance) {
        //        setDefaultProperties(instance, args[0], options);
        //    }
            
        //    return instance;
        //}

        //// copy prototype so intanceof operator still works
        //f.prototype = original.prototype;

        //// return new constructor (will override original)
        //return f;
        function test(args: any[]) {
            if (debug)
                debugger;
            args[0] = args[0] || {};
            for (let key in options) {
                args[0][key] = isDefined(args[0][key]) ? args[0][key] : options[key](args[0]);
            }
            return args;
        }

        return class extends (<ConstructorFunc<Base>>original) {
            initializeDefaults() {

            }
            constructor( ...args: any[]) {
                super(...test(args));
                if (setDefaultsOnInstance) {
                    if (debug)
                        debugger;

                    setDefaultProperties(this, args[0], options);
                }

               
               

                if ("initializeDefaults" in this) {
                    this.initializeDefaults();
                }
            }
        } as any;
    };
}
