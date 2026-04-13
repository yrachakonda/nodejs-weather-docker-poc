{{- define "logstash.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "logstash.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "logstash.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "logstash.labels" -}}
helm.sh/chart: {{ include "logstash.chart" . }}
{{ include "logstash.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end -}}

{{- define "logstash.selectorLabels" -}}
app.kubernetes.io/name: {{ include "logstash.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "logstash.serviceName" -}}
{{ include "logstash.fullname" . }}
{{- end -}}

{{- define "logstash.headlessServiceName" -}}
{{ include "logstash.fullname" . }}-headless
{{- end -}}

{{- define "logstash.configMapName" -}}
{{ include "logstash.fullname" . }}-config
{{- end -}}
