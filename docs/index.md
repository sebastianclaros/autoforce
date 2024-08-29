# Scripts de Automatizacion

## Como se ejecutan los scripts

```
yarn auto start <<issueNumber>>
```

## Acciones y subtareas

En la carpeta automation nos encontramos con scripts de acciones, que serian las acciones comunes que queremos automatizar dentro de nuestro proceso de desarrollo.

Asi identificamos las siguientes:

- [new](#new-crear-un-requerimiento-nuevo)
- [start](#start-iniciar-un-requerimiento-nuevo)
- [stop](#stop-poner-un-requerimiento-en-pausa-para-mas-tarde-o-bien-para-que-lo-tome-otro):
- [finish](#finish-al-terminar-el-desarrollo-de-un-requerimiento):
- [deploy](#deploy):
- [cancel](#cancel):
- [rollback](#rollback):

```mermaid
stateDiagram-v2
[*] --> Backlog : new
Backlog --> Ready : refine
Ready --> InProgress : start
InProgress --> Ready :stop
InProgress --> Completed : finish
Completed --> Approved :approve
Completed --> Ready :reject
Approved --> Done : deploy
Approved --> Cancelled : cancel
InProgress --> Cancelled : cancel
Completed --> Cancelled: cancel
Cancelled --> Ready : reopen
Cancelled --> [*]
Done --> [*]
Done --> Cancelled : rollback
```

Mientras que los estados del Issue son:

```mermaid
stateDiagram-v2
[*] --> Open
Open --> Closed : close wont fix
Open --> Resolved :close
Closed --> Open : reopen
Resolved --> Open :reopen
Open --> Archive :archive
Archive --> Open :desarchive
Closed --> [*]
Resolved --> [*]
Archive --> [*]
```

## New: Crear un Requerimiento Nuevo

Crea un nuevo Issue y lo deja en Backlog

```
new (title, issueType)
└── create-issue ( title, issueType)
```

## Start: Iniciar un Requerimiento Nuevo

Si arrancamos de cero cuando llamamos a start, quien va a crear la branch y la scratch

```
start (issueNumber, issueType, dias=7)
├── validate-issue ( issueNumber, 'Ready')
├── create-branch ( issueNumber, nombreDelRequerimiento)
├── move-issue ( issueNumber, 'In Progress')
├── assign-user-issue ( issueNumber, me )
├── assign-branch-issue ( issueNumber, branch )
└── create-scracth ( issueNumber, nombreDelRequerimiento, dias)
```

Por ejemplo:

```
yarn auto start 32  bugfix-productDetail
```

## stop: Poner un requerimiento en pausa para mas tarde o bien para que lo tome otro

```
stop
├── validate-scratch ()
├── move-issue ( issueNumber, 'Ready')
├── label-issue ( issueNumber, 'motivo')
├── comment-issue ( issueNumber, 'comment')
└── publish-branch
```

## finish: Completar el desarrollo de un Requerimiento

```
finish
├── validate-scratch
├── validate-code
├── update-doc
├── publish-branch
├── create-pull-request ('main')
├── move-issue ( issueNumber, 'Completed' )
├── deploy-code ( issueNumber, 'qa')
├── sanity-test( 'qa')
└── drop-scracth
```

## Approve: Aprobar o validar el desarrollo del requerimiento

```
approved (issueNumber)
└── move-issue ( issueNumber, 'Approved')
```

## Reject: Desaprobar o reabrir un desarrollo

```
rejected (issueNumber)
└── move-issue ( issueNumber, 'Ready')
```

## Deploy:

```
deploy
├── validate-issue ('Approved')
├── deploy-code( 'prod')
├── sanity-test( 'prod')
├── merge-pull-request( )
├── close-pull-request
├── move-issue ('deployed')
└── drop-branch
```

## Cancel:

```
cancelled (issueNumber)
├── validate-issue ('Approved', 'Completed', 'Finished'  )
├── drop-branch
├── close-pull-request
├── comment-pull-request ( issueNumber, 'comment')
└── move-issue ( issueNumber, 'Cancelled')
```

## Rollback:

```
rollback (issueNumber)
├── reopen-pull-request
├── revert-commit
└── move-issue ( issueNumber, 'Cancelled')
```

## View

## List

## Switch

## Como generar un token en GitLab

Para poder ejecutar las acciones contra Gitlab tenes que tener un token personal. Sino tenes uno entra con tu cuenta a Gitlab, dentro de User Settings/Access Tokens y ahi Personal Access Token [link](https://gitlab.com/-/user_settings/personal_access_tokens) ).

Hace clic en add new token con al menos los siguientes privilegios:

> api
> read_api
> read_user
> read_repository
> write_repository

Para mas info [link](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)

Una vez obtenido el token hay que guardarlo en una variable de ambiente. Esto puede ser editando .bash_profile o .bashrc. Agregar una linea asi:

```
export GITLAB_TOKEN=<<PegarTokenDeGitLab>>
```

## Como generar un Token en Github

Para poder ejecutar las acciones contra Github tenes que tener un token personal. Sino tenes uno entra con tu cuenta a Github, dentro de Settings/Developer Settings y ahi Personal Access Token/Token Classic ( o bien ingresa a el siguiente [link](https://github.com/settings/tokens) ).

Hace clic en Generate New Token Classic con al menos los siguientes privilegios:

Repo > repo:status > repo_deployment > public_repo
Project > Read project

Si bien no es recomendable el No Expiration, simplifica esta actualizandolo.

Una vez obtenido el token hay que guardarlo en una variable de ambiente. Esto puede ser editando .bash_profile o .bashrc. Agregar una linea asi:

```
export GITHUB_TOKEN=<<PegarTokenDeGitHub>>
```
