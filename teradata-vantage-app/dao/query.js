exports.findDatabases = "SELECT distinct databasename from dbc.tablesv order by databasename";
exports.findTables = "SELECT distinct tablename from dbc.tablesv where databasename=:X order by tablename";
exports.findColumns = "SELECT distinct columnname from dbc.columnsv where databasename=:X and tablename=:Y order by columnname";