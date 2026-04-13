{{- define "observability-stack.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "observability-stack.fullname" -}}
{{- .Release.Name -}}
{{- end -}}

{{- define "observability-stack.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" -}}
{{- end -}}
