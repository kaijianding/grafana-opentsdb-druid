///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['angular', 'lodash', 'app/plugins/sdk'], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var angular_1, lodash_1, sdk_1;
    var OpenTsQueryCtrl;
    return {
        setters:[
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            }],
        execute: function() {
            OpenTsQueryCtrl = (function (_super) {
                __extends(OpenTsQueryCtrl, _super);
                /** @ngInject */
                function OpenTsQueryCtrl($routeParams, $scope, $injector, $timeout, templateSrv) {
                    var _this = this;
                    _super.call(this, $scope, $injector);
                    this.$timeout = $timeout;
                    this.templateSrv = templateSrv;
                    this.errors = this.validateTarget();
                    this.aggregators = ['avg', 'sum', 'min', 'max', 'dev', 'zimsum', 'mimmin', 'mimmax'];
                    this.downsampleAggregators = ['avg', 'count', 'sum', 'min', 'max'];
                    this.fillPolicies = ['none', 'null', 'zero'];
                    this.granularities = ['auto', '1m', '10m', '60m'];
                    this.linesLimitOptions = {
                        'all': 'all',
                        'shuffle': 'avg:sample:@num',
                        'highest max': 'max:top:@num',
                        'highest average': 'avg:top:@num',
                        'lowest average': 'avg:bottom:@num',
                        'lowest max': 'max:bottom:@num',
                        'average above': 'avg:above:@num',
                        'max above': 'max:above:@num',
                        'min above': 'min:above:@num',
                        'average below': 'avg:below:@num',
                        'max below': 'max:below:@num',
                        'min below': 'min:below:@num',
                    };
                    this.linesLimitKeys = Object.keys(this.linesLimitOptions);
                    this.tsdbVersion = this.datasource.tsdbVersion;
                    if (!this.target.aggregator) {
                        this.target.aggregator = 'sum';
                    }
                    if (!this.target.downsampleFillPolicy) {
                        this.target.downsampleFillPolicy = 'none';
                    }
                    this.datasource.getAggregators().then(function (aggs) {
                        if (aggs.length !== 0) {
                            _this.aggregators = aggs;
                        }
                    });
                    this.datasource.getDownsampleAggregators().then(function (aggs) {
                        if (aggs.length !== 0) {
                            _this.downsampleAggregators = aggs;
                            if (!_this.target.downsampleAggregator) {
                                _this.target.downsampleAggregator = aggs[0];
                            }
                        }
                    });
                    if (!this.target.aggregateMethod) {
                        this.target.aggregateMethod = 'highest average';
                    }
                    if (!this.target.aggregateNumber) {
                        this.target.aggregateNumber = 10;
                    }
                    this.datasource.getFilterTypes().then(function (filterTypes) {
                        _this.filterTypes = filterTypes;
                    });
                    this.datasource.getGranularities().then(function (granularities) {
                        _this.granularities = granularities;
                        if (granularities.length > 1) {
                            _this.granularities.unshift("auto");
                        }
                        if (!_this.target.granularity) {
                            _this.target.granularity = _this.granularities[0];
                        }
                    });
                    // needs to be defined here as it is called from typeahead
                    this.suggestMetrics = function (query, callback) {
                        $timeout.cancel(_this.timer);
                        if (!lodash_1.default.isEmpty(query)) {
                            _this.timer = $timeout(function () {
                                _this.datasource.suggestMetrics(query).then(callback);
                            }, 250);
                        }
                    };
                    this.suggestTagKeys = function (query, callback) {
                        callback(_this.tagKeys);
                    };
                    this.suggestTagValues = function (query, callback) {
                        $timeout.cancel(_this.timer);
                        if (!lodash_1.default.isEmpty(query)) {
                            _this.timer = $timeout(function () {
                                _this.datasource.suggestTagValues(_this.target.metric, _this.target.currentFilterKey, query).then(callback);
                            }, 250);
                        }
                    };
                    this.getTagValues = function (query, callback) {
                        $timeout.cancel(_this.timer);
                        if (!lodash_1.default.isEmpty(query)) {
                            _this.timer = $timeout(function () {
                                return _this.datasource.suggestTagValues(_this.target.metric, _this.currentTagKey, query).then(callback);
                            }, 250);
                        }
                    };
                    //get tagk
                    var tempMetric = this.templateSrv.replace(this.target.metric);
                    if (!lodash_1.default.isEmpty(tempMetric)) {
                        $timeout(function () {
                            return _this.datasource.suggestTagKeys(tempMetric).then(function (tagKeys) {
                                _this.tagKeys = tagKeys;
                            });
                        }, 5);
                    }
                    this.copyTarget();
                }
                // only metric change then update tagk
                OpenTsQueryCtrl.prototype.updateTagk = function () {
                    var _this = this;
                    var tempMetric = this.templateSrv.replace(this.target.metric);
                    this.datasource.suggestTagKeys(tempMetric).then(function (tagKeys) {
                        _this.tagKeys = tagKeys;
                    });
                };
                OpenTsQueryCtrl.prototype.targetBlur_tagk = function () {
                    var _this = this;
                    this.errors = this.validateTarget();
                    this.$timeout.cancel(this.timer);
                    this.timer = this.$timeout(function () {
                        if (!lodash_1.default.isEqual(_this.oldTarget, _this.target)) {
                            if (!lodash_1.default.isEmpty(_this.oldTarget) && !lodash_1.default.isEqual(_this.oldTarget.metric, _this.templateSrv.replace(_this.target.metric))) {
                                delete _this.target.tags;
                            }
                            _this.copyTarget();
                            _this.updateTagk();
                            _this.refresh();
                        }
                    }, 250);
                };
                OpenTsQueryCtrl.prototype.targetBlur = function () {
                    var _this = this;
                    this.errors = this.validateTarget();
                    this.$timeout.cancel(this.timer);
                    this.timer = this.$timeout(function () {
                        if (!lodash_1.default.isEqual(_this.oldTarget, _this.target)) {
                            if (!lodash_1.default.isEmpty(_this.oldTarget) && !lodash_1.default.isEqual(_this.oldTarget.metric, _this.templateSrv.replace(_this.target.metric))) {
                                delete _this.target.tags;
                            }
                            if (!_this.target.tags) {
                                _this.target.tags = {};
                            }
                            lodash_1.default.each(_this.target.tags, function (value, key) {
                                if (value === '') {
                                    delete _this.target.tags[key];
                                }
                            });
                            _this.copyTarget();
                            _this.refresh();
                        }
                    }, 250);
                };
                OpenTsQueryCtrl.prototype.copyTarget = function () {
                    this.oldTarget = angular_1.default.copy(this.target);
                    this.oldTarget.metric = this.templateSrv.replace(this.oldTarget.metric);
                };
                OpenTsQueryCtrl.prototype.removeTag = function (key) {
                    if (this.target.tags) {
                        delete this.target.tags[key];
                        this.targetBlur();
                    }
                };
                OpenTsQueryCtrl.prototype.addFilter = function () {
                    if (this.target.tags && lodash_1.default.size(this.target.tags) > 0) {
                        this.errors.filters = 'Please remove tags to use filters, tags and filters are mutually exclusive.';
                    }
                    if (!this.addFilterMode) {
                        this.addFilterMode = true;
                        return;
                    }
                    if (!this.target.filters) {
                        this.target.filters = [];
                    }
                    if (!this.target.currentFilterType) {
                        this.target.currentFilterType = 'iliteral_or';
                    }
                    if (!this.target.currentFilterGroupBy) {
                        this.target.currentFilterGroupBy = false;
                    }
                    this.errors = this.validateTarget();
                    if (!this.errors.filters) {
                        var currentFilter = {
                            type: this.target.currentFilterType,
                            tagk: this.target.currentFilterKey,
                            filter: this.target.currentFilterValue,
                            groupBy: this.target.currentFilterGroupBy,
                        };
                        this.target.filters.push(currentFilter);
                        this.target.currentFilterType = 'literal_or';
                        this.target.currentFilterKey = '';
                        this.target.currentFilterValue = '';
                        this.target.currentFilterGroupBy = false;
                        this.targetBlur();
                    }
                    this.addFilterMode = false;
                };
                OpenTsQueryCtrl.prototype.removeFilter = function (index) {
                    this.target.filters.splice(index, 1);
                    this.targetBlur();
                };
                OpenTsQueryCtrl.prototype.editFilter = function (fil, index) {
                    this.removeFilter(index);
                    this.target.currentFilterKey = fil.tagk;
                    this.target.currentFilterValue = fil.filter;
                    this.target.currentFilterType = fil.type;
                    this.target.currentFilterGroupBy = fil.groupBy;
                    this.addFilter();
                };
                OpenTsQueryCtrl.prototype.closeAddFilterMode = function () {
                    this.addFilterMode = false;
                };
                OpenTsQueryCtrl.prototype.linesLimitBlur = function () {
                    // error logic
                    // template
                    this.target.limit = this.linesLimitOptions[this.target.aggregateMethod].replace('@num', this.target.aggregateNumber);
                    this.refresh();
                };
                OpenTsQueryCtrl.prototype.validateTarget = function () {
                    return {};
                };
                OpenTsQueryCtrl.templateUrl = 'partials/query.editor.html';
                return OpenTsQueryCtrl;
            })(sdk_1.QueryCtrl);
            exports_1("OpenTsQueryCtrl", OpenTsQueryCtrl);
        }
    }
});
//# sourceMappingURL=query_ctrl.js.map