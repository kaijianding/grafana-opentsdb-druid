System.register(['angular', 'lodash', 'app/core/utils/datemath'], function(exports_1) {
    var angular_1, lodash_1, dateMath;
    var OpenTsDatasource;
    return {
        setters:[
            function (angular_1_1) {
                angular_1 = angular_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (dateMath_1) {
                dateMath = dateMath_1;
            }],
        execute: function() {
            OpenTsDatasource = (function () {
                /** @ngInject */
                function OpenTsDatasource(instanceSettings, $q, backendSrv, templateSrv) {
                    this.$q = $q;
                    this.backendSrv = backendSrv;
                    this.templateSrv = templateSrv;
                    this.type = 'opentsdb-druid';
                    this.url = instanceSettings.url;
                    this.name = instanceSettings.name;
                    this.withCredentials = instanceSettings.withCredentials;
                    this.basicAuth = instanceSettings.basicAuth;
                    instanceSettings.jsonData = instanceSettings.jsonData || {};
                    this.tsdbVersion = instanceSettings.jsonData.tsdbVersion || 1;
                    this.tsdbResolution = instanceSettings.jsonData.tsdbResolution || 1;
                    this.delayTime = 30000;
                    this.limit = 'avg:top:10';
                    this.aggregatorsPromise = null;
                    this.filterTypesPromise = null;
                }
                // Called once per panel (graph)
                OpenTsDatasource.prototype.query = function (options) {
                    var _this = this;
                    var start = this.convertToTSDBTime(options.rangeRaw.from, false, options.timezone);
                    var end = this.convertToTSDBTime(options.rangeRaw.to, true, options.timezone);
                    var qs = [];
                    lodash_1.default.each(options.targets, function (target) {
                        if (!target.metric) {
                            return;
                        }
                        qs.push(_this.convertTargetToQuery(target, options, _this.tsdbVersion));
                    });
                    var queries = lodash_1.default.compact(qs);
                    // No valid targets, return the empty result to save a round trip.
                    if (lodash_1.default.isEmpty(queries)) {
                        var d = this.$q.defer();
                        d.resolve({ data: [] });
                        return d.promise;
                    }
                    var groupByTags = {};
                    lodash_1.default.each(queries, function (query) {
                        if (query.filters && query.filters.length > 0) {
                            lodash_1.default.each(query.filters, function (val) {
                                groupByTags[val.tagk] = true;
                            });
                        }
                        else {
                            lodash_1.default.each(query.tags, function (val, key) {
                                groupByTags[key] = true;
                            });
                        }
                    });
                    options.targets = lodash_1.default.filter(options.targets, function (query) {
                        return query.hide !== true;
                    });
                    return this.performTimeSeriesQuery(queries, start, end).then(function (response) {
                        var metricToTargetMapping = _this.mapMetricsToTargets(response.data, options, _this.tsdbVersion);
                        var result = lodash_1.default.map(response.data, function (metricData, index) {
                            index = metricToTargetMapping[index];
                            if (index === -1) {
                                index = 0;
                            }
                            return _this.transformMetricData(metricData, groupByTags, options.targets[index], options, _this.tsdbResolution);
                        });
                        //sorted by summary desc
                        var sortedLegend = lodash_1.default.sortBy(result, function (item) {
                            return -item.summary;
                        });
                        return { data: sortedLegend };
                    });
                };
                OpenTsDatasource.prototype.targetContainsTemplate = function (target) {
                    if (target.filters && target.filters.length > 0) {
                        for (var i = 0; i < target.filters.length; i++) {
                            if (this.templateSrv.variableExists(target.filters[i].filter)) {
                                return true;
                            }
                        }
                    }
                    if (target.tags && Object.keys(target.tags).length > 0) {
                        for (var tagKey in target.tags) {
                            if (this.templateSrv.variableExists(target.tags[tagKey])) {
                                return true;
                            }
                        }
                    }
                    return false;
                };
                OpenTsDatasource.prototype.performTimeSeriesQuery = function (queries, start, end) {
                    var reqBody = {
                        start: start,
                        queries: queries,
                    };
                    if (this.tsdbVersion === 3) {
                        reqBody.showQuery = true;
                    }
                    // Relative queries (e.g. last hour) don't include an end time
                    // the most recent data point is usually not fully completed, this can let the trend be misleading, so we reduce the end here
                    var delayEndTime = Date.now().valueOf() - this.delayTime;
                    if (end) {
                        reqBody.end = end > delayEndTime ? delayEndTime : end;
                    }
                    else {
                        reqBody.end = delayEndTime;
                    }
                    var options = {
                        method: 'POST',
                        url: this.url + '/api/query',
                        data: reqBody,
                    };
                    this._addCredentialOptions(options);
                    return this.backendSrv.datasourceRequest(options);
                };
                OpenTsDatasource.prototype.getGranularities = function () {
                    return this._get('/api/granularities', {}).then(function (result) {
                        return result.data;
                    });
                };
                OpenTsDatasource.prototype.suggestMetrics = function (query) {
                    return this._performSuggestQuery(query, 'metrics');
                };
                OpenTsDatasource.prototype.suggestTagKeys = function (metric) {
                    return this._performSuggestQuery(metric, 'tagk');
                };
                OpenTsDatasource.prototype.suggestTagValues = function (metric, tagk, query) {
                    return this._performSuggestQuery_tagv(metric, tagk, query);
                };
                OpenTsDatasource.prototype._performSuggestQuery = function (query, type) {
                    var options = this.templateSrv;
                    var start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
                    var end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
                    return this._get('/api/suggest', {
                        type: type,
                        q: query,
                        max: 1000,
                        start: start,
                        end: end
                    }).then(function (result) {
                        return result.data;
                    });
                };
                OpenTsDatasource.prototype._performSuggestQuery_tagv = function (metric, tagk, query) {
                    var options = this.templateSrv;
                    var start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
                    var end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
                    return this._get('/api/suggesttagv', {
                        q: query,
                        qDelimiter: ',',
                        max: 30,
                        metric: metric,
                        tagk: tagk,
                        start: start,
                        end: end
                    }).then(function (result) {
                        return result.data;
                    });
                };
                OpenTsDatasource.prototype._performMetricKeyValueLookup = function (metric, keys) {
                    if (!metric || !keys) {
                        return this.$q.when([]);
                    }
                    var keysArray = keys.split(',');
                    var tagk = keysArray[0];
                    keysArray.shift();
                    var keysQuery = '';
                    if (keysArray.length > 0) {
                        keysQuery = keysArray.join(',');
                    }
                    var options = this.templateSrv;
                    var start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
                    var end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
                    return this._get('/api/suggesttagv', {
                        q: keysQuery,
                        qDelimiter: ',',
                        metric: metric,
                        tagk: tagk,
                        start: start,
                        end: end
                    }).then(function (result) {
                        return result.data;
                    });
                };
                OpenTsDatasource.prototype._performMetricKeyValueLookupWithDelimiter = function (metric, tagk, filterDelimiter) {
                    if (!metric || !tagk) {
                        return this.$q.when([]);
                    }
                    var filters = filterDelimiter.split(',');
                    var delimiter = filters[0];
                    filters.shift();
                    var keysQuery = '';
                    if (filters.length > 0) {
                        keysQuery = filters.join(',');
                    }
                    var options = this.templateSrv;
                    var start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
                    var end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
                    return this._get('/api/suggesttagv', {
                        q: keysQuery,
                        qDelimiter: delimiter,
                        metric: metric,
                        tagk: tagk,
                        start: start,
                        end: end
                    }).then(function (result) {
                        return result.data;
                    });
                };
                OpenTsDatasource.prototype._get = function (relativeUrl, params) {
                    var options = {
                        method: 'GET',
                        url: this.url + relativeUrl,
                        params: params,
                    };
                    this._addCredentialOptions(options);
                    return this.backendSrv.datasourceRequest(options);
                };
                OpenTsDatasource.prototype._addCredentialOptions = function (options) {
                    if (this.basicAuth || this.withCredentials) {
                        options.withCredentials = true;
                    }
                    if (this.basicAuth) {
                        options.headers = { Authorization: this.basicAuth };
                    }
                };
                OpenTsDatasource.prototype.metricFindQuery = function (query) {
                    if (!query) {
                        return this.$q.when([]);
                    }
                    var interpolated;
                    try {
                        interpolated = this.templateSrv.replace(query, {}, 'distributed');
                    }
                    catch (err) {
                        return this.$q.reject(err);
                    }
                    var responseTransform = function (result) {
                        return lodash_1.default.map(result, function (value) {
                            return { text: value };
                        });
                    };
                    var metricsRegex = /metrics\((.*)\)/;
                    var tagNamesRegex = /tag_names\((.*)\)/;
                    var tagValuesRegex = /tag_values\((.*?),\s?(.*)\)/;
                    var tagValuesWithFiltersRegex = /tag_values_with_filters\((.*?),\s?(.*?),\s?(.*)\)/;
                    var metricsQuery = interpolated.match(metricsRegex);
                    if (metricsQuery) {
                        return this.suggestMetrics(metricsQuery[1]).then(responseTransform);
                    }
                    var tagNamesQuery = interpolated.match(tagNamesRegex);
                    if (tagNamesQuery) {
                        return this.suggestTagKeys(tagNamesQuery[1]).then(responseTransform);
                    }
                    var tagValuesQuery = interpolated.match(tagValuesRegex);
                    if (tagValuesQuery) {
                        return this._performMetricKeyValueLookup(tagValuesQuery[1], tagValuesQuery[2]).then(responseTransform);
                    }
                    var tagValuesWithFiltersQuery = interpolated.match(tagValuesWithFiltersRegex);
                    if (tagValuesWithFiltersQuery) {
                        return this._performMetricKeyValueLookupWithDelimiter(tagValuesWithFiltersQuery[1], tagValuesWithFiltersQuery[2], tagValuesWithFiltersQuery[3]).then(responseTransform);
                    }
                    return this.$q.when([]);
                };
                OpenTsDatasource.prototype.testDatasource = function () {
                    return this.getFilterTypes().then(function () {
                        return { status: 'success', message: 'Data source is working' };
                    });
                };
                OpenTsDatasource.prototype.getAggregators = function () {
                    if (this.aggregatorsPromise) {
                        return this.aggregatorsPromise;
                    }
                    this.aggregatorsPromise = this._get('/api/aggregators').then(function (result) {
                        if (result.data && lodash_1.default.isArray(result.data)) {
                            return result.data.sort();
                        }
                        return [];
                    });
                    return this.aggregatorsPromise;
                };
                OpenTsDatasource.prototype.getDownsampleAggregators = function () {
                    if (this.downsampleAggregatorsPromise) {
                        return this.downsampleAggregatorsPromise;
                    }
                    this.downsampleAggregatorsPromise = this._get('/api/downsampleAggregators').then(function (result) {
                        if (result.data && lodash_1.default.isArray(result.data)) {
                            return result.data.sort();
                        }
                        return [];
                    });
                    return this.downsampleAggregatorsPromise;
                };
                OpenTsDatasource.prototype.getFilterTypes = function () {
                    if (this.filterTypesPromise) {
                        return this.filterTypesPromise;
                    }
                    this.filterTypesPromise = this._get('/api/config/filters').then(function (result) {
                        if (result.data) {
                            return Object.keys(result.data).sort();
                        }
                        return [];
                    });
                    return this.filterTypesPromise;
                };
                OpenTsDatasource.prototype.transformMetricData = function (md, groupByTags, target, options, tsdbResolution) {
                    var metricLabel = this.createMetricLabel(md, target, groupByTags, options);
                    var dps = [];
                    // TSDB returns datapoints has a hash of ts => value.
                    // Can't use _.pairs(invert()) because it stringifies keys/values
                    lodash_1.default.each(md.dps, function (v, k) {
                        if (tsdbResolution === 2) {
                            dps.push([v, k * 1]);
                        }
                        else {
                            dps.push([v, k * 1000]);
                        }
                    });
                    return { target: metricLabel, datapoints: dps, summary: md.summary };
                };
                OpenTsDatasource.prototype.createMetricLabel = function (md, target, groupByTags, options) {
                    if (target.alias) {
                        var scopedVars = lodash_1.default.clone(options.scopedVars || {});
                        lodash_1.default.each(md.tags, function (value, key) {
                            scopedVars['tag_' + key] = { value: value };
                        });
                        return this.templateSrv.replace(target.alias, scopedVars);
                    }
                    var label = md.metric;
                    var tagData = [];
                    if (!lodash_1.default.isEmpty(md.tags)) {
                        lodash_1.default.each(lodash_1.default.toPairs(md.tags), function (tag) {
                            if (lodash_1.default.has(groupByTags, tag[0])) {
                                tagData.push(tag[0] + '=' + tag[1]);
                            }
                        });
                    }
                    if (!lodash_1.default.isEmpty(tagData)) {
                        label += '{' + tagData.join(', ') + '}';
                    }
                    return label;
                };
                OpenTsDatasource.prototype.convertTargetToQuery = function (target, options, tsdbVersion) {
                    if (!target.metric || target.hide) {
                        return null;
                    }
                    var query = {
                        metric: this.templateSrv.replace(target.metric, options.scopedVars, 'pipe'),
                        aggregator: 'avg',
                        limit: this.limit
                    };
                    if (target.aggregator) {
                        query.aggregator = this.templateSrv.replace(target.aggregator);
                    }
                    if (target.limit) {
                        query.limit = this.templateSrv.replace(target.limit);
                    }
                    if (target.shouldComputeRate) {
                        query.rate = true;
                        query.rateOptions = {
                            counter: !!target.isCounter,
                            qps: !!target.isQps
                        };
                        if (target.counterMax && target.counterMax.length) {
                            query.rateOptions.counterMax = parseInt(target.counterMax, 10);
                        }
                        if (target.counterResetValue && target.counterResetValue.length) {
                            query.rateOptions.resetValue = parseInt(target.counterResetValue, 10);
                        }
                        if (tsdbVersion >= 2) {
                            query.rateOptions.dropResets =
                                !query.rateOptions.counterMax && (!query.rateOptions.ResetValue || query.rateOptions.ResetValue === 0);
                        }
                    }
                    if (!target.disableDownsampling) {
                        query.downsample = target.downsampleAggregator;
                        if (target.downsampleFillPolicy && target.downsampleFillPolicy !== 'none') {
                            query.downsample += '-' + target.downsampleFillPolicy;
                        }
                    }
                    if (target.filters && target.filters.length > 0) {
                        // ignore empty filter
                        query.filters = angular_1.default.copy(target.filters.filter(function (f) { return f.filter; }));
                        if (query.filters) {
                            for (var filterKey in query.filters) {
                                query.filters[filterKey].filter = this.templateSrv.replace(query.filters[filterKey].filter, options.scopedVars, 'pipe');
                            }
                        }
                    }
                    else {
                        query.tags = angular_1.default.copy(target.tags);
                        if (query.tags) {
                            for (var tagKey in query.tags) {
                                query.tags[tagKey] = this.templateSrv.replace(query.tags[tagKey], options.scopedVars, 'pipe');
                            }
                        }
                    }
                    if (target.granularity && target.granularity !== 'auto') {
                        query.granularity = target.granularity;
                    }
                    return query;
                };
                OpenTsDatasource.prototype.mapMetricsToTargets = function (metrics, options, tsdbVersion) {
                    var _this = this;
                    var interpolatedTagValue, arrTagV;
                    return lodash_1.default.map(metrics, function (metricData) {
                        if (tsdbVersion === 3) {
                            return metricData.query.index;
                        }
                        else {
                            return lodash_1.default.findIndex(options.targets, function (target) {
                                if (target.filters && target.filters.length > 0) {
                                    return target.metric === metricData.metric;
                                }
                                else {
                                    return (target.metric === metricData.metric &&
                                        lodash_1.default.every(target.tags, function (tagV, tagK) {
                                            interpolatedTagValue = _this.templateSrv.replace(tagV, options.scopedVars, 'pipe');
                                            arrTagV = interpolatedTagValue.split('|');
                                            return lodash_1.default.includes(arrTagV, metricData.tags[tagK]) || interpolatedTagValue === '*';
                                        }));
                                }
                            });
                        }
                    });
                };
                OpenTsDatasource.prototype.convertToTSDBTime = function (date, roundUp, timezone) {
                    if (date === 'now') {
                        return null;
                    }
                    date = dateMath.parse(date, roundUp);
                    return date.valueOf();
                };
                return OpenTsDatasource;
            })();
            exports_1("OpenTsDatasource", OpenTsDatasource);
        }
    }
});
//# sourceMappingURL=datasource.js.map