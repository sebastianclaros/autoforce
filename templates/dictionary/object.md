---
title: { { label } }
---

<!-- START autogenerated-object -->

## Descripción

{{description}}

- Label: {{label}}
- ApiName: {{fullName}}
- Sharing Mode: {{sharingModel}}
- Visibilidad: {{visibility}}
- [Ver en Salesforce](https://test.salesforce.com/lightning/setup/ObjectManager/lookupRedirect?lookup=entityByApiName&apiName={{fullName}})

## Campos

| #   | Label | Api Name | Tipo | Descripcion |
| --- | ----- | -------- | ---- | ----------- |

{{#each fields}}
{{#unless (isManaged this)}}
| <div class="icons">{{attributesFormula}}</div> | {{label}} | {{fullName}} | {{typeFormula}} | {{descriptionFormula}} <ul>{{#each valueSet.valueSetDefinition.value}}<li>{{label}}</li>{{/each}}</ul> |
{{/unless}}
{{/each}}

| #                                                              | Referencia    |
| -------------------------------------------------------------- | ------------- |
| <div class="icons">![Required](/img/lock_60.png)</div>         | Requerido     |
| <div class="icons">![Esternal Id](/img/database_60.png)</div>  | External Id   |
| <div class="icons">![Track History](/img/tracker_60.png)</div> | Track History |
| <div class="icons">![Encripted](/img/password_60.png)</div>    | Encriptado    |

<!-- END autogenerated-object -->
