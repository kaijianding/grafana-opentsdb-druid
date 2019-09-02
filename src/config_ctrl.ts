export class OpenTsConfigCtrl {
  static templateUrl = 'partials/config.html';
  current: any;

  /** @ngInject */
  constructor($scope) {
    this.current.jsonData = this.current.jsonData || {};
    this.current.jsonData.tsdbVersion = this.current.jsonData.tsdbVersion || 2;
    this.current.jsonData.tsdbResolution = this.current.jsonData.tsdbResolution || 1;
  }

  tsdbVersions = [{ name: '==2.2', value: 2 }];

  tsdbResolutions = [{ name: 'second', value: 1 }, { name: 'millisecond', value: 2 }];
}
