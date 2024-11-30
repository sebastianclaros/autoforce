# Autoforce

El proyecto esta en Beta todavia, recien fue migrado a Typescript y paso de ser unos scripts aislados a un modulo que se puede instalar y ejecutar directamente tipo CLI.


## Objetivo

La motivacion de crear la herramienta fue facilitar y automatizar las tareas comunes que realizamos los desarrolladores, especialmente los que utilizamos Salesforce.

Me vi en la necesidad de tener una herramienta porque muchas veces me ganaba la ansiedad y queria hacer varios cambios juntos. Sentia que hacer varios stories, cada una con su branch, y todo el proceso era perder mucho tiempo. Pero cuando uno logra automatizar el repositorio queda mas prolijo y la trazabilidad tambien, y permite que otros desarrolladores puedan colaborar de forma mas simple.

En general cuando desarrollamos, repetimos mas o menos las mismas tareas. Arrancamos a desarrollar algo nuevo (start), terminamos ese desarrollo(finish), o bien dejarlo a un costado (stop), y posiblemente lo descartamos por completo (cancel). Dependiendo la tecnologia, el tipo de desarrollo, y que estrategia de branching, entre otras cosas mas, estas tareas podrian ser distintas.

En este repo las tareas buscan automatizar o integrar el siguiente tipo gestiones:

- Branching Strategy en Git (Github o Gitlab)
- Armado de ambiente de desarrollo (Salesforce)
- Gestion de proyecto (Github projects, Gitlab projects o Jira).
- Documentacion (Github pages o GitLab pages. Version mejorada con docusaurus)
- Calidad de codigo (PMD)
- Uso de IA ( OpenAI, )


## Roadmap Status

1. Modelos
    - [Model A] "Procesos de Negocio en Clientes de Salesforce": 70%
        Salesforce: Scratchs con Tracking y deploys usando sf cli 
        Documentacion: Markdowns de Procesos con Github pages
        Gestion de Proyecto: Github Project
        Source Control: Github
        Branching Strategy: Github workflow

    - [Model B] "Desarrollo de Producto": 0%

    - [Custom] "Modelo personalizado" 

2. Github Services
    - Github: Listo
    - Gitlab: 20%
    - Bitbucket: 0%

3. Project Services
    - Github: Listo
    - Gitlab: 0%
    - Jira: 0%

4. Documentation Services
    - Object: 90%
    - Classes: 80%
    - LWC: 10%

5. IA
    - Code creation: 0%
    - Test classes: 0%
    - Commit Messages: 0%
    - Code Reviewer: 0%
    - Documentation: 0%




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


Hay un proyecto de test para analizar y probar la herramienta. 

https://github.com/sebastianclaros/autoforce-test

La guia del readme sirve de ejemplo.


## Testear una version

Para hacer un testeo local se puede generar una version nueva

```
yarn build && yarn pack
```

Y despues en algun proyecto se puede instalar

```
yarn add -D files:<<path-to-file>>
```
