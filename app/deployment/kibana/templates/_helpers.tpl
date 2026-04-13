{{- define "kibana.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kibana.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- include "kibana.name" . -}}
{{- end -}}
{{- end -}}

{{- define "kibana.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kibana.labels" -}}
helm.sh/chart: {{ include "kibana.chart" . }}
app.kubernetes.io/name: {{ include "kibana.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "kibana.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kibana.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
