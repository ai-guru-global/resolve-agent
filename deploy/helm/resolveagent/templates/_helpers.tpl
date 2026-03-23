{{/*
Expand the name of the chart.
*/}}
{{- define "resolveagent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "resolveagent.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "resolveagent.labels" -}}
helm.sh/chart: {{ include "resolveagent.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: resolveagent
{{- end }}

{{/*
Selector labels for platform
*/}}
{{- define "resolveagent.platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resolveagent.name" . }}-platform
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: platform
{{- end }}

{{/*
Selector labels for runtime
*/}}
{{- define "resolveagent.runtime.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resolveagent.name" . }}-runtime
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: runtime
{{- end }}
