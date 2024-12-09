# Autoforce

El proyecto esta todavia en Beta todavia, pero la idea es que pueda estar productivo para algunos proyectos pronto.


## Objetivo

Hace un tiempo estabamos armando un repo para hacer practicas sobre Salesforce. Y empezamos a crear unos scripts para crear una instancia y subir el codigo. La idea fue evolucionando, y los scripts se fueron complejizando. Tambien surgieron limitaciones, si algo fallaba se quedaba por la mitad, los que tenian windows algunas cosas no funcionaban, y termine moviendo la idea a una herramienta.

El objetivo termino siendo facilitar y automatizar las tareas comunes que realizamos los desarrolladores. Si bien empece con Salesforce, la idea es generalizarla para que soporte distintos modelos, de hecho uno es para este mismo proyecto :)

## Orden en un Repositorio

Soy muy ansioso, y muchas veces queria hacer varios cambios juntos, el famoso ya que estoy aca tocando, o se me ocurrio algo. Pero despues es dificil de seguir, o se hacen mas largas las code reviews, etc.

Asi que el primer objetivo fue organizar el proyecto, si tengo una idea la guardo enseguida (new). Y si quiero arrancar algo, puedo empezar por ver las proximas stories (list). 


## Tareas repetitivas

El segundo objetivo fue que pueda arrancar el desarrollo y arme el entorno, cree una branch y suba datos de prueba (start). Y por otro lado, cuando termine ese desarrollo,que baje los cambios en la scratch, documente, y valide la calidad del codigo(finish).

Basicamente las tareas comunes que identificamos fueron:
1. start
2. finish
3. stop
4. cancel


En cada una de ellas buscamos automatizar o integrar las siguientes gestiones:
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
