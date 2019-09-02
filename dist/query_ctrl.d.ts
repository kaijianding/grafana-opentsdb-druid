/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { QueryCtrl } from 'app/plugins/sdk';
export declare class OpenTsQueryCtrl extends QueryCtrl {
    private $timeout;
    private templateSrv;
    static templateUrl: string;
    aggregators: any;
    downsampleAggregators: any;
    granularities: any;
    granularity: any;
    linesLimitOptions: any;
    linesLimitKeys: any;
    fillPolicies: any;
    filterTypes: any;
    tsdbVersion: any;
    errors: any;
    suggestMetrics: any;
    suggestTagKeys: any;
    suggestTagValues: any;
    getTagValues: any;
    currentTagKey: any;
    addFilterMode: boolean;
    oldTarget: any;
    timer: any;
    tagKeys: any;
    /** @ngInject */
    constructor($routeParams: any, $scope: any, $injector: any, $timeout: any, templateSrv: any);
    updateTagk(): void;
    targetBlur_tagk(): void;
    targetBlur(): void;
    copyTarget(): void;
    removeTag(key: any): void;
    addFilter(): void;
    removeFilter(index: any): void;
    editFilter(fil: any, index: any): void;
    closeAddFilterMode(): void;
    linesLimitBlur(): void;
    validateTarget(): {};
}
