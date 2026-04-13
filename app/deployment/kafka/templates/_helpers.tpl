{{- define "kafka.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kafka.fullname" -}}
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

{{- define "kafka.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "kafka.labels" -}}
helm.sh/chart: {{ include "kafka.chart" . }}
{{ include "kafka.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end -}}

{{- define "kafka.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kafka.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "kafka.serviceName" -}}
{{ include "kafka.fullname" . }}
{{- end -}}

{{- define "kafka.headlessServiceName" -}}
{{ include "kafka.fullname" . }}-headless
{{- end -}}

{{- define "kafka.uiName" -}}
{{ include "kafka.fullname" . }}-ui
{{- end -}}

{{- define "kafka.topicInitName" -}}
{{ include "kafka.fullname" . }}-topic-init
{{- end -}}

{{- define "kafka.bootstrapAddress" -}}
{{ include "kafka.serviceName" . }}:{{ .Values.service.port }}
{{- end -}}

{{- define "kafka.controllerAddress" -}}
{{ printf "%s-0.%s.%s.svc.cluster.local:%d" (include "kafka.fullname" .) (include "kafka.headlessServiceName" .) .Release.Namespace (.Values.service.controllerPort | int) }}
{{- end -}}
