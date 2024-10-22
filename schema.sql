create table users
(
    id                         varchar(18) not null
        primary key,
    username                   varchar(32) not null
        constraint unique_username
            unique,
    email                      varchar     not null
        constraint unique_email
            unique,
    password                   varchar     not null,
    activated                  boolean default false,
    role                       integer default 0,
    pfp                        varchar,
    communicationdisableduntil bigint
);

create table bots
(
    id       varchar(18) not null
        constraint bots_pk
            primary key,
    owner_id varchar(18) not null
        constraint bots_users_id_fk
            references users
);

create table tokens
(
    id    varchar(18) not null
        constraint tokens_users_id_fk
            references users,
    token varchar     not null,
    seed  integer     not null
);

create index tokens_id_seed_token_index
    on tokens (id, seed, token);

create table email_verifications
(
    id    varchar(18) not null
        constraint email_verifications_users_id_fk
            references users,
    token varchar     not null
);

