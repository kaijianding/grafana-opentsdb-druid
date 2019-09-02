## OpenTSDB-Druid Data Source Plugin For Grafana

Druid datasource plugin provides a support for [Druid](https://druid.apache.org/) as a backend datasource via opentsdb protocol v2.2.

### Quick start
Install from [grafana.net](https://grafana.net/plugins/grafana-opentsdb-druid)

OR

Copy files to your [Grafana plugin directory](http://docs.grafana.org/plugins/installation/#grafana-plugin-directory). Restart Grafana, check datasources list at http://your.grafana.instance/datasources/new, choose Opentsdb-druid option.

### Access to Druid via HTTP
Page configuration is standard

![settings](https://user-images.githubusercontent.com/8663725/64116935-55e80b00-cdc6-11e9-95a8-67a0450e0645.jpg)  

the url is like http://localhost:8082/opentsdb/flink_metrics  
the `flink_metrics` is the backend druid datasource base name

### Query setup

Query setup interface:

![query editor image](https://user-images.githubusercontent.com/8663725/64117267-4b7a4100-cdc7-11e9-8f81-c5fba5cdb2c3.jpg)

The interface is based on the build-in grafana opentsdb data source, and with 4 differences:
1. remove downsample interval
2. add line limit options
3. add granularity to route to different backend druid datasource for different granularity
4. automatically get tag list related to the specified metric

### Development

Use NPM managers:

```sh
npm install
```
and then
```sh
grunt
```

### Contribute

If you have any idea for an improvement or found a bug do not hesitate to open an issue or submit a pull request.
We will appreciate any help from the community which will make working with such amazing products as Druid and Grafana more convenient.

License
-------
GPL V3 License, please see [LICENSE](https://github.com/kaijianding/grafana-opentsdb-druid/blob/master/LICENSE) for details. Please share your modification to make improve this plugin
