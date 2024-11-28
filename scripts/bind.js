export function bind(scope, fn) {
    //use : bind(this,function(){this.x++;}) - returns a function where "this" refers to the scoped this
    return function () {
        fn.apply(scope, arguments);
    };
}