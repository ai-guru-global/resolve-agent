{{/*
Expand the name of the chart.
*/}}
{{- define "resolvenet.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "resolvenet.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "resolvenet.labels" -}}
helm.sh/chart: {{ include "resolvenet.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: resolvenet
{{- end }}

{{/*
Selector labels for platform
*/}}
{{- define "resolvenet.platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resolvenet.name" . }}-platform
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: platform
{{- end }}

{{/*
Selector labels for runtime
*/}}
{{- define "resolvenet.runtime.selectorLabels" -}}
app.kubernetes.io/name: {{ include "resolvenet.name" . }}-runtime
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: runtime
{{- end }}
