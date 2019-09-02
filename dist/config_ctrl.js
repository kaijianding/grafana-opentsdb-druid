System.register([], function(exports_1) {
    var OpenTsConfigCtrl;
    return {
        setters:[],
        execute: function() {
            OpenTsConfigCtrl = (function () {
                /** @ngInject */
                function OpenTsConfigCtrl($scope) {
                    this.tsdbVersions = [{ name: '==2.2', value: 2 }];
                    this.tsdbResolutions = [{ name: 'second', value: 1 }, { name: 'millisecond', value: 2 }];
                    this.current.jsonData = this.current.jsonData || {};
                    this.current.jsonData.tsdbVersion = this.current.jsonData.tsdbVersion || 2;
                    this.current.jsonData.tsdbResolution = this.current.jsonData.tsdbResolution || 1;
                }
                OpenTsConfigCtrl.templateUrl = 'partials/config.html';
                return OpenTsConfigCtrl;
            })();
            exports_1("OpenTsConfigCtrl", OpenTsConfigCtrl);
        }
    }
});
//# sourceMappingURL=config_ctrl.js.map