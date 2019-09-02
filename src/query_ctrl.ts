///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import angular from 'angular';
import _ from 'lodash';
import { QueryCtrl } from 'app/plugins/sdk';

export class OpenTsQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';
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
  constructor($routeParams, $scope, $injector, private $timeout, private templateSrv) {
    super($scope, $injector);

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

    this.datasource.getAggregators().then(aggs => {
      if (aggs.length !== 0) {
        this.aggregators = aggs;
      }
    });

    this.datasource.getDownsampleAggregators().then(aggs => {
      if (aggs.length !== 0) {
        this.downsampleAggregators = aggs;
        if (!this.target.downsampleAggregator) {
          this.target.downsampleAggregator = aggs[0];
        }
      }
    });

    if (!this.target.aggregateMethod) {
      this.target.aggregateMethod = 'highest average';
    }

    if (!this.target.aggregateNumber) {
      this.target.aggregateNumber = 10;
    }

    this.datasource.getFilterTypes().then(filterTypes => {
      this.filterTypes = filterTypes;
    });

    this.datasource.getGranularities().then(granularities => {
      this.granularities = granularities;
      if (granularities.length > 1) {
        this.granularities.unshift("auto");
      }
      if (!this.target.granularity) {
        this.target.granularity = this.granularities[0];
      }
    });

    // needs to be defined here as it is called from typeahead
    this.suggestMetrics = (query, callback) => {
      $timeout.cancel(this.timer);
      if (!_.isEmpty(query)) {
        this.timer = $timeout(() => {
          this.datasource.suggestMetrics(query).then(callback);
        }, 250);
      }
    };

    this.suggestTagKeys = (query, callback) => {
      callback(this.tagKeys);
    };

    this.suggestTagValues = (query, callback) => {
      $timeout.cancel(this.timer);
      if (!_.isEmpty(query)) {
        this.timer = $timeout(() => {
          this.datasource.suggestTagValues(this.target.metric, this.target.currentFilterKey, query).then(callback);
        }, 250);
      }
    };

    this.getTagValues = (query, callback) => {
      $timeout.cancel(this.timer);
      if (!_.isEmpty(query)) {
        this.timer = $timeout(() => {
          return this.datasource.suggestTagValues(this.target.metric, this.currentTagKey, query).then(callback);
        }, 250);
      }
    };

    //get tagk
    const tempMetric = this.templateSrv.replace(this.target.metric);
    if (!_.isEmpty(tempMetric)) {
      $timeout(() => {
        return this.datasource.suggestTagKeys(tempMetric).then((tagKeys) => {
          this.tagKeys = tagKeys;
        });
      }, 5);
    }

    this.copyTarget();
  }

  // only metric change then update tagk
  updateTagk() {
    const tempMetric = this.templateSrv.replace(this.target.metric);
    this.datasource.suggestTagKeys(tempMetric).then((tagKeys) => {
      this.tagKeys = tagKeys;
    });
  }

  targetBlur_tagk() {
    this.errors = this.validateTarget();

    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout(() => {
      if (!_.isEqual(this.oldTarget, this.target)) {
        if (!_.isEmpty(this.oldTarget) && !_.isEqual(this.oldTarget.metric, this.templateSrv.replace(this.target.metric))) {
          delete this.target.tags;
        }
        this.copyTarget();
        this.updateTagk();
        this.refresh();
      }
    }, 250);
  }

  targetBlur() {
    this.errors = this.validateTarget();

    this.$timeout.cancel(this.timer);
    this.timer = this.$timeout(() => {
      if (!_.isEqual(this.oldTarget, this.target)) {
        if (!_.isEmpty(this.oldTarget) && !_.isEqual(this.oldTarget.metric, this.templateSrv.replace(this.target.metric))) {
          delete this.target.tags;
        }
        if (!this.target.tags) {
          this.target.tags = {};
        }

        _.each(this.target.tags, (value, key) => {
          if (value === '') {
            delete this.target.tags[key];
          }
        });
        this.copyTarget();
        this.refresh();
      }
    }, 250);
  }

  copyTarget() {
    this.oldTarget = angular.copy(this.target);
    this.oldTarget.metric = this.templateSrv.replace(this.oldTarget.metric);
  }

  removeTag(key) {
    if (this.target.tags) {
      delete this.target.tags[key];
      this.targetBlur();
    }
  }

  addFilter() {
    if (this.target.tags && _.size(this.target.tags) > 0) {
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
      const currentFilter = {
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
  }

  removeFilter(index) {
    this.target.filters.splice(index, 1);
    this.targetBlur();
  }

  editFilter(fil, index) {
    this.removeFilter(index);
    this.target.currentFilterKey = fil.tagk;
    this.target.currentFilterValue = fil.filter;
    this.target.currentFilterType = fil.type;
    this.target.currentFilterGroupBy = fil.groupBy;
    this.addFilter();
  }

  closeAddFilterMode() {
    this.addFilterMode = false;
  }

  linesLimitBlur() {
    // error logic
    // template
    this.target.limit = this.linesLimitOptions[this.target.aggregateMethod].replace('@num', this.target.aggregateNumber);
    this.refresh();
  }

  validateTarget() {
    return {};
  }
}
