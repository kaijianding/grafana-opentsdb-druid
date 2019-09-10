export declare class OpenTsDatasource {
    private $q;
    private backendSrv;
    private templateSrv;
    private static EMPTY_PLACEHOLDER;
    type: any;
    url: any;
    name: any;
    withCredentials: any;
    basicAuth: any;
    tsdbVersion: any;
    tsdbResolution: any;
    delayTime: any;
    limit: any;
    aggregatorsPromise: any;
    downsampleAggregatorsPromise: any;
    filterTypesPromise: any;
    /** @ngInject */
    constructor(instanceSettings: any, $q: any, backendSrv: any, templateSrv: any);
    query(options: any): any;
    targetContainsTemplate(target: any): boolean;
    performTimeSeriesQuery(queries: any, start: any, end: any): any;
    getGranularities(): any;
    suggestMetrics(query: any): any;
    suggestTagKeys(metric: any): any;
    suggestTagValues(metric: any, tagk: any, query: any): any;
    _performSuggestQuery(query: any, type: any): any;
    _performSuggestQuery_tagv(metric: any, tagk: any, query: any): any;
    _performMetricKeyValueLookup(metric: any, keys: any): any;
    _performMetricKeyValueLookupWithDelimiter(metric: any, tagk: any, filterDelimiter: any): any;
    _get(relativeUrl: any, params?: any): any;
    _addCredentialOptions(options: any): void;
    metricFindQuery(query: any): any;
    testDatasource(): any;
    getAggregators(): any;
    getDownsampleAggregators(): any;
    getFilterTypes(): any;
    transformMetricData(md: any, groupByTags: any, target: any, options: any, tsdbResolution: any): {
        target: any;
        datapoints: any[];
        summary: any;
    };
    createMetricLabel(md: any, target: any, groupByTags: any, options: any): any;
    convertTargetToQuery(target: any, options: any, tsdbVersion: any): any;
    mapMetricsToTargets(metrics: any, options: any, tsdbVersion: any): any;
    convertToTSDBTime(date: any, roundUp: any, timezone: any): any;
}
