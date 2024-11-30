---
slug: /docs/instalacion
sidebar_position: 0
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Instalación 

Autoforce es una herramienta de linea de comandos (CLI) que busca ayudar a desarrolladores, especialmente de Salesforce, en tareas repetitivas y estandarizadas, enfocandolos y ayudando a ser mas productivos.

Ademas de instalar autoforce dependiendo de las tareas tambien deberá instalar algunas dependencias.

## Instalacion de autoforce

Para instalar autoforce en un repositorio git local, dentro de dicha carpeta ejecute:

<Tabs>
  <TabItem value="npm" label="npm">
    ``` bash
    npm install -D autoforce
    ```
  </TabItem>
  <TabItem value="yarn" label="Yarn" default>
    ``` bash
    yarn add -D autoforce
    ```
  </TabItem>
</Tabs>

Si el repositorio no tiene un package.json va a dar un error. 

Ahora para probar la instalación puede ver la versión:

```
npx autoforce version
```

##  Instalando dependencias 

### Git
Para tareas que usen comando de git, por ejemplo para crear una branch localmente o hacer un commit.

[Instalar git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

### Instalar Salesforce CLI

Para tareas que requieran crear un ambiente efimero de desarrollo (scratch).

Saleforce CLI es la herramienta de linea de comando que nos permite subir codigo a nuestra scracth, y bajar de la misma distinto metadatos que son creados dentro de la UI de SF.

[Bajar el CLI](https://developer.salesforce.com/tools/salesforcecli)

Cualquier cosa consultar la [guia de instalacion](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm)

### Conenctarse al DevHub

Ahora que tienen el cli y el devhub, tenemos que autenticarnos a fin de el cli puedan conectarse al devhun y crear scratch orgs. 

Con el siguiente comando nos autenticamos y a su vez lo seteamos a este devhub como default (-d). Si no lo ponemos default, ya sea porque tenemos otros DevHubs, al crear una scratch tendriamos que decirle desde que devhub la tiene que crear.

```
sf org login web -d -a myhuborg
```

si no funciona el login web, esto puede pasar en algunos windows, pueden usar el flujo de device

```
sf org login device -d -a myhuborg
```