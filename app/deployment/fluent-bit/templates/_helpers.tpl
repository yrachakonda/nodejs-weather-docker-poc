{{- define "fluent-bit.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "fluent-bit.fullname" -}}
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

{{- define "fluent-bit.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "fluent-bit.labels" -}}
helm.sh/chart: {{ include "fluent-bit.chart" . }}
{{ include "fluent-bit.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end -}}

{{- define "fluent-bit.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fluent-bit.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "fluent-bit.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "fluent-bit.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "fluent-bit.namespaceRegex" -}}
{{- if .Values.config.namespaceFilter.namespaces -}}
^({{ join "|" .Values.config.namespaceFilter.namespaces }})$
{{- else -}}
^$
{{- end -}}
{{- end -}}
