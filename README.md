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

## Tipos de Modelos

Al principio habia pensando en una lista de modelos, ejemplo paquetes de appexchange y otro para proyectos sobre salesforce. 

Pero al final vi que los modelos son combinaciones de acuerdo a las siguientes variables:
- Branching strategy: En este sentido, el start y finish van a hacer task distintas, si quiero un gitflow o main
- Tipo de desarrollo: Si estoy desarrollando paquetes o usango scratch en el start voy a buscar que me arme un ambiente nuevo 
- Tipo de Projecto: Si el projecto maneja milestones como releases, cambian o se agregan mas preguntas en algunos steps
- Modelo de documentacion: La documentacion estaria muy relacionada con el tipo de desarrollo, pero quedo como una variable aparte por orden.


## Roadmap Status

1. Implementaciones
    - "Procesos de Negocio en Clientes de Salesforce": 70%
        Salesforce: Scratchs con Tracking y deploys usando sf cli 
        Documentacion: Markdowns de Procesos con Github pages
        Gestion de Proyecto: Project con milestones
        Branching Strategy: Github workflow

    - "Desarrollo de Producto": 30%
        Salesforce: Scratchs con Tracking y deploys con second generation package 
        Documentacion: Markdowns de Procesos con Github pages
        Gestion de Proyecto: Project con milestones
        Branching Strategy: Gitflow workflow


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


## Repositorio de Ejemplo
En el siguiente [repositorio](https://github.com/sebastianclaros/autoforce-test) tomamos como ejemplo un proyecto de Salesforce. 
En la carpeta scripts/test hay una serie de comandos (all.sh), que hace de forma autamtizada lo siguiente:

* Hace un upgrade de autoforce
* Crea un Milestone representando un release nuevo
* Crea 3 issues dentro de ese Milestone







## Uso

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



## Testear una version en forma local

Para hacer un testeo local se puede generar una version nueva

```
yarn build && yarn pack
```

Y despues en algun proyecto se puede instalar

```
yarn add -D files:<<path-to-file>>
```
