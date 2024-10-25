# Autoforce

El proyecto esta en todavia beta, esta recien migrado a Typescript y a ser un modulo instalable.


## Objetivo

La idea de la herramienta era facilitar y automatizar las tareas comunes que realizamos los desarrolladores. A medida que pasa el tiempo tenemos cada vez mas herramientas diarias y especificas, pero las tareas en si son las misma, queremos arrancar a desarrollar algo nuevo (start), terminar el desarrollo(finish), dejarlo a un costado (stop), o bien cancelarlo (cancel).

En este repo las tareas buscan automatizar o integrar el siguiente tipo gestiones:

- Branching Strategy en Git (Github o Gitlab)
- Armado de ambiente de desarrollo (Salesforce)
- Gestion de proyecto (Github projects, Gitlab projects o Jira).
- Documentacion (Github pages o GitLab pages. Version mejorada con docusaurus)
- Calidad de codigo (PMD)
- Uso de IA ( OpenAI, )


## Instalación

```
yarn add -D autoforce
```

Chequear instalacion

```
npx autoforce version
```


## Usos
Una vez instalado se puede crear scripts a medida o bien ejecutar 

```
npx autoforce <<comando>>
```

Los comandos son

* help
* version
* config
* task <<taskname>> <<opciones>>
* subtask <<subtaskname>> <<opciones>>
* new <<template>>

Si no se ingresa ningun comando asume que es task

Y si no se ingresan parametros, tiene un modo asistido que los va a ir preguntando. Por ejemplo para el comando new, dara una lista de opciones de acuerdo a los templates.




## Testear una version

Para hacer un testeo local se puede generar una version nueva

```
yarn build && yarn pack
```

Y despues en algun proyecto se puede instalar

```
yarn add -D files:<<path-to-file>>
```
