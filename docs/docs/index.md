# Scripts de Automatizacion

## Como se ejecutan los scripts

``` bash
npx autoforce start <<issueNumber>>
```


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
