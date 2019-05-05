

import * as ko from "knockout";


function isDefined(obj: any) {
    return !(typeof obj === "undefined" || obj === null);
}
function isFunc(objOrFunc: any): objOrFunc is Function {
    return typeof objOrFunc === "function";
}
export const __obsrvs = "__obsrvs";
export const __obsrvs__init = "__obsrvs_init";

export type DefaultValueType<T, T1> = ((target: T) => ko.ObservableArray<T1>) | ((target: T) => ko.Observable<T1>) | ((target: T) => ko.Computed<T1>) | ((target: T) => T1) | ko.Observable<T1> | T1;

export interface ObservableDecoratorOptions<T, T1> {
    logOnChange?: boolean;
    defaultValue?: DefaultValueType<T, T1>,
    readOnly?: boolean;
    afterInit?: (t: T, o: ko.Observable<T1> | ko.ObservableArray<T1> | ko.Computed<T1>) => void,
    beforeSetter?: (v: any) => T1,
    getArrayAsObservable?: boolean;
    refresh?: number;
}


let defaultValueEvaluator = function <T, T1>(target: T, defaultValue?: DefaultValueType<T, T1>): ko.ObservableArray<T1> | ko.Observable<T1> | T1 | ko.Computed<T1> {
    if (ko.isObservable(defaultValue)) {
        return defaultValue;
    } else {

        if (isFunc(defaultValue)) {
            return defaultValue(target);
        }
        else {
            return defaultValue;
        }
    }
}

export function isObservableArray(value: any): value is ko.ObservableArray<any> {
    return ko.isObservable(value) && ('map' in value || 'push' in value)    // if "map ispresent, observablemappedarrays and fallback to push for normal arrays.
}


function intializeState(instance: any) {
    if (!(__obsrvs__init in instance)) {
        Object.defineProperty(instance, __obsrvs__init, {
            value: {},
            enumerable: false,
            configurable: false,
            writable: false
        });
    }
    if (!(__obsrvs in instance)) {
        Object.defineProperty(instance, __obsrvs, {
            value: {},
            configurable: false,
            enumerable: false,
            writable: false
        });
    }
}

export function createProperty<T, T1>(
    target: T,
    key: string,
    options: ObservableDecoratorOptions<T, T1>,
    defaultValue: (t: T) => T1 = (t) => undefined): any | void {

    if (!isDefined(options.getArrayAsObservable)) {
        options.getArrayAsObservable = true;
    }

    let oldDesc = Object.getOwnPropertyDescriptor(target, key);

    if (oldDesc && oldDesc.get) {
        defaultValue = ((instance: T) => {
            let b = "refresh" in options ? ko.observable(0) : (b?) => 0;
            let c = ko.computed<T1>({ read: () => (b(),oldDesc.get.call(instance)), owner: instance });

            if ("refresh" in options) {
                setInterval(() => {
                    b(b() + 1);
                }, options.refresh);
            }

            return c;
        }) as any;
    }

    var initialize = createInitializer<T, T1>(
        key,
        options,
        defaultValue
    );
    // property getter                                  
    var getter = function (): T1 | ko.ObservableArray<T1> | T1[] {
        
        var observable = initialize(this);
        if (isObservableArray(observable)) {
            return options.getArrayAsObservable ? observable : observable();
        } else {
            return observable();
        }
    };

    // property setter
    var setter = function (newVal: any) {

        if (options.beforeSetter) {
            newVal = options.beforeSetter(newVal);
        }

        intializeState(this);

         
        if (!this[__obsrvs][key]) {

           
            this[__obsrvs__init][key] = newVal;
            initialize(this);
        } else {
            var obs = <ko.Observable<T1>>initialize(this);
            obs(newVal);
        }
    };

    if (delete target[key]) {

        let desc = {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        };
        Object.defineProperty(target, key, desc);

        return desc;
    }
}



function SafeStringify(o: any) {
    let cache = [] as any[];
    let json = JSON.stringify(o, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    });
    cache = null; // Enable garbage collection
    return json;
};

function isPromise<T extends any>(obj: T | Promise<T>): obj is Promise<T> {
    if (obj === null)
        return false;

    switch (typeof obj) {
        case "string":
        case "boolean":
        case "number":
        case "undefined":
            return false;
        default:
            return "then" in obj && typeof obj["then"] === "function";
    }
}

function createInitializer<T, T1>(key: string,
    options: ObservableDecoratorOptions<T, T1>, defaultValueFunc: (t: T) => T1 = (t) => undefined) {

    // let isInitialized = false;
    function initialize(instance: T) {

        intializeState(instance);

        var _val: ko.Observable<T1> | ko.ObservableArray<T1> | ko.Computed<T1> = instance[__obsrvs][key];

        if (!_val) {

            var defaultValue = instance[__obsrvs__init][key] || defaultValueFunc.call(instance, instance) || defaultValueEvaluator<T, T1>(instance, options.defaultValue) || instance[__obsrvs__init][key];

            if (isPromise(defaultValue)) {
                let promise = defaultValue;
                defaultValue = ko.observable();
                promise.then(v => defaultValue(v));
            }

            _val = instance[__obsrvs][key] = ko.isComputed(defaultValue) || ko.isObservable(defaultValue) ? defaultValue : Array.isArray(defaultValue) ? ko.observableArray(defaultValue) : ko.observable(defaultValue);

            if (options.logOnChange) {
                var _priv = _val() as any;
                _val.subscribe(v => {
                    console.log(`Obsr: '${instance}' ${key}': ${SafeStringify(_priv)} => ${SafeStringify(v)}`);
                    _priv = v;
                }, null, null);
            }

            if (options.afterInit) {
                options.afterInit(instance, _val);
            }
        }


        return _val;
    };
    return initialize;
}

export function observable<T>(target?: T, key?: string) { createProperty(target, key, { getArrayAsObservable: false }) };

export function Observable<T, T1>(options: ObservableDecoratorOptions<T, T1> = {}) {

    return (target?: T, key?: string) => createProperty(target, key, options);
}

export function subscribe<T>(valueFunc: () => T, read: (value: T) => void) {

    return ko.computed(() => {
        let value = valueFunc();
        if (!ko.computedContext.isInitial()) {
            ko.ignoreDependencies(() => read(value));
        }
    });
}
export function subscribeOnce<T>(valueFunc: () => T, read: (value: T) => void) {

    let computed= ko.computed(() => {
        let value = valueFunc();
        if (!ko.computedContext.isInitial()) {
            ko.ignoreDependencies(() => read(value));
            computed.dispose();
        }
    });
}
export function computed<T>(executor: () => T) {
    return Observable<any, T>({ defaultValue: (self) => ko.computed<T>(executor.bind(self)) });

}
export function propergate(getter: () => void, parentKey: string = null) {
    return (target: any, key: string) => {


        // if (!(key in target)) {
        let old = Object.getOwnPropertyDescriptor(target, key);

        return {
            configurable: false,
            value: function (vm: any, event: MouseEvent) {

                let parent = getter.call(this);

                parent[parentKey || key].apply(parent, Array.prototype.concat.apply([], arguments).concat([this]));
                old.value.apply(this, arguments);
            }
        };
        // }

    };
}


export default observable;

