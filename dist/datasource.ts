import angular from 'angular';
import _ from 'lodash';
import * as dateMath from 'app/core/utils/datemath';

export class OpenTsDatasource {
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
  constructor(instanceSettings, private $q, private backendSrv, private templateSrv) {
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
  query(options) {
    const start = this.convertToTSDBTime(options.rangeRaw.from, false, options.timezone);
    const end = this.convertToTSDBTime(options.rangeRaw.to, true, options.timezone);
    const qs = [];

    _.each(options.targets, target => {
      if (!target.metric) {
        return;
      }
      qs.push(this.convertTargetToQuery(target, options, this.tsdbVersion));
    });

    const queries = _.compact(qs);

    // No valid targets, return the empty result to save a round trip.
    if (_.isEmpty(queries)) {
      const d = this.$q.defer();
      d.resolve({ data: [] });
      return d.promise;
    }

    const groupByTags = {};
    _.each(queries, query => {
      if (query.filters && query.filters.length > 0) {
        _.each(query.filters, val => {
          groupByTags[val.tagk] = true;
        });
      } else {
        _.each(query.tags, (val, key) => {
          groupByTags[key] = true;
        });
      }
    });

    options.targets = _.filter(options.targets, query => {
      return query.hide !== true;
    });

    return this.performTimeSeriesQuery(queries, start, end).then(response => {
      const metricToTargetMapping = this.mapMetricsToTargets(response.data, options, this.tsdbVersion);
      const result = _.map(response.data, (metricData: any, index: number) => {
        index = metricToTargetMapping[index];
        if (index === -1) {
          index = 0;
        }

        return this.transformMetricData(metricData, groupByTags, options.targets[index], options, this.tsdbResolution);
      });

      //sorted by summary desc
      var sortedLegend = _.sortBy(result, function (item) {
        return -item.summary;
      });
      return {data: sortedLegend};
    });
  }

  targetContainsTemplate(target) {
    if (target.filters && target.filters.length > 0) {
      for (let i = 0; i < target.filters.length; i++) {
        if (this.templateSrv.variableExists(target.filters[i].filter)) {
          return true;
        }
      }
    }

    if (target.tags && Object.keys(target.tags).length > 0) {
      for (const tagKey in target.tags) {
        if (this.templateSrv.variableExists(target.tags[tagKey])) {
          return true;
        }
      }
    }

    return false;
  }

  performTimeSeriesQuery(queries, start, end) {
    const reqBody: any = {
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
    } else {
      reqBody.end = delayEndTime;
    }

    const options = {
      method: 'POST',
      url: this.url + '/api/query',
      data: reqBody,
    };

    this._addCredentialOptions(options);
    return this.backendSrv.datasourceRequest(options);
  }

  getGranularities() {
    return this._get('/api/granularities', {
    }).then(result => {
      return result.data;
    });
  }

  suggestMetrics(query) {
    return this._performSuggestQuery(query, 'metrics');
  }

  suggestTagKeys(metric) {
    return this._performSuggestQuery(metric, 'tagk');
  }

  suggestTagValues(metric, tagk, query) {
    return this._performSuggestQuery_tagv(metric, tagk, query);
  }

  _performSuggestQuery(query, type) {
    const options = this.templateSrv;

    const start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
    const end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
      return this._get('/api/suggest', {
          type: type,
          q: query,
          max: 1000,
          start: start,
          end: end
      }).then(result => {
          return result.data;
      });
  }

  _performSuggestQuery_tagv(metric, tagk, query) {
    const options = this.templateSrv;

    const start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
    const end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
      return this._get('/api/suggesttagv', {
          q: query,
          max: 30,
          metric: metric,
          tagk: tagk,
          start: start,
          end: end
      }).then(result => {
          return result.data;
      });
  }

  _performMetricKeyValueLookup(metric, keys) {
    if (!metric || !keys) {
      return this.$q.when([]);
    }

    const keysArray = keys.split(',').map(key => {
      return key.trim();
    });
    const tagk = keysArray[0];
    keysArray.shift();
    let keysQuery = '';

    if (keysArray.length > 0) {
      keysQuery = keysArray.join(',');
    }
    const options = this.templateSrv;

    const start = this.convertToTSDBTime(options.timeRange.from, false, options.timezone);
    const end = this.convertToTSDBTime(options.timeRange.to, true, options.timezone);
    return this._get('/api/suggesttagv', {
      q: keysQuery,
      metric: metric,
      tagk: tagk,
      start: start,
      end: end
    }).then(result => {
      return result.data;
    });
  }

  _get(relativeUrl, params?) {
    const options = {
      method: 'GET',
      url: this.url + relativeUrl,
      params: params,
    };

    this._addCredentialOptions(options);

    return this.backendSrv.datasourceRequest(options);
  }

  _addCredentialOptions(options) {
    if (this.basicAuth || this.withCredentials) {
      options.withCredentials = true;
    }
    if (this.basicAuth) {
      options.headers = { Authorization: this.basicAuth };
    }
  }

  metricFindQuery(query) {
    if (!query) {
      return this.$q.when([]);
    }

    let interpolated;
    try {
      interpolated = this.templateSrv.replace(query, {}, 'distributed');
    } catch (err) {
      return this.$q.reject(err);
    }

    const responseTransform = result => {
      return _.map(result, value => {
        return { text: value };
      });
    };

    const metricsRegex = /metrics\((.*)\)/;
    const tagNamesRegex = /tag_names\((.*)\)/;
    const tagValuesRegex = /tag_values\((.*?),\s?(.*)\)/;

    const metricsQuery = interpolated.match(metricsRegex);
    if (metricsQuery) {
      return this.suggestMetrics(metricsQuery[1]).then(responseTransform);
    }

    const tagNamesQuery = interpolated.match(tagNamesRegex);
    if (tagNamesQuery) {
      return this.suggestTagKeys(tagNamesQuery[1]).then(responseTransform);
    }

    const tagValuesQuery = interpolated.match(tagValuesRegex);
    if (tagValuesQuery) {
      return this._performMetricKeyValueLookup(tagValuesQuery[1], tagValuesQuery[2]).then(responseTransform);
    }

    return this.$q.when([]);
  }

  testDatasource() {
    return this.getFilterTypes().then(() => {
      return { status: 'success', message: 'Data source is working' };
    });
  }

  getAggregators() {
    if (this.aggregatorsPromise) {
      return this.aggregatorsPromise;
    }

    this.aggregatorsPromise = this._get('/api/aggregators').then(result => {
      if (result.data && _.isArray(result.data)) {
        return result.data.sort();
      }
      return [];
    });
    return this.aggregatorsPromise;
  }

  getDownsampleAggregators() {
      if (this.downsampleAggregatorsPromise) {
          return this.downsampleAggregatorsPromise;
      }

      this.downsampleAggregatorsPromise = this._get('/api/downsampleAggregators').then(result => {
          if (result.data && _.isArray(result.data)) {
              return result.data.sort();
          }
          return [];
      });
      return this.downsampleAggregatorsPromise;
  }

  getFilterTypes() {
    if (this.filterTypesPromise) {
      return this.filterTypesPromise;
    }

    this.filterTypesPromise = this._get('/api/config/filters').then(result => {
      if (result.data) {
        return Object.keys(result.data).sort();
      }
      return [];
    });
    return this.filterTypesPromise;
  }

  transformMetricData(md, groupByTags, target, options, tsdbResolution) {
    const metricLabel = this.createMetricLabel(md, target, groupByTags, options);
    const dps = [];

    // TSDB returns datapoints has a hash of ts => value.
    // Can't use _.pairs(invert()) because it stringifies keys/values
    _.each(md.dps, (v: any, k: number) => {
      if (tsdbResolution === 2) {
        dps.push([v, k * 1]);
      } else {
        dps.push([v, k * 1000]);
      }
    });

    return { target: metricLabel, datapoints: dps, summary: md.summary };
  }

  createMetricLabel(md, target, groupByTags, options) {
    if (target.alias) {
      const scopedVars = _.clone(options.scopedVars || {});
      _.each(md.tags, (value, key) => {
        scopedVars['tag_' + key] = { value: value };
      });
      return this.templateSrv.replace(target.alias, scopedVars);
    }

    let label = md.metric;
    const tagData = [];

    if (!_.isEmpty(md.tags)) {
      _.each(_.toPairs(md.tags), tag => {
        if (_.has(groupByTags, tag[0])) {
          tagData.push(tag[0] + '=' + tag[1]);
        }
      });
    }

    if (!_.isEmpty(tagData)) {
      label += '{' + tagData.join(', ') + '}';
    }

    return label;
  }

  convertTargetToQuery(target, options, tsdbVersion) {
    if (!target.metric || target.hide) {
      return null;
    }

    const query: any = {
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
      query.filters = angular.copy(target.filters.filter(f => f.filter));
      if (query.filters) {
        for (const filterKey in query.filters) {
          query.filters[filterKey].filter = this.templateSrv.replace(
            query.filters[filterKey].filter,
            options.scopedVars,
            'pipe'
          );
        }
      }
    } else {
      query.tags = angular.copy(target.tags);
      if (query.tags) {
        for (const tagKey in query.tags) {
          query.tags[tagKey] = this.templateSrv.replace(query.tags[tagKey], options.scopedVars, 'pipe');
        }
      }
    }

    if (target.granularity && target.granularity !== 'auto') {
      query.granularity = target.granularity;
    }

    return query;
  }

  mapMetricsToTargets(metrics, options, tsdbVersion) {
    let interpolatedTagValue, arrTagV;
    return _.map(metrics, metricData => {
      if (tsdbVersion === 3) {
        return metricData.query.index;
      } else {
        return _.findIndex(options.targets as any[], target => {
          if (target.filters && target.filters.length > 0) {
            return target.metric === metricData.metric;
          } else {
            return (
              target.metric === metricData.metric &&
              _.every(target.tags, (tagV, tagK) => {
                interpolatedTagValue = this.templateSrv.replace(tagV, options.scopedVars, 'pipe');
                arrTagV = interpolatedTagValue.split('|');
                return _.includes(arrTagV, metricData.tags[tagK]) || interpolatedTagValue === '*';
              })
            );
          }
        });
      }
    });
  }

  convertToTSDBTime(date, roundUp, timezone) {
    if (date === 'now') {
      return null;
    }

    date = dateMath.parse(date, roundUp);
    return date.valueOf();
  }
}
