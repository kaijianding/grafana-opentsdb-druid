FROM grafana/grafana:6.2.5

COPY dist /var/lib/grafana/plugins/grafana-opentsdb-druid
COPY dashboards /etc/grafana/provisioning/dashboards/druid
COPY dashboards.yml /etc/grafana/provisioning/dashboards/
COPY datasource.yml /etc/grafana/provisioning/datasources/