import { HttpClient, HttpHeaders, HttpErrorResponse, } from '@angular/common/http';
import { catchError, Observable, retry, Subject, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { Connection } from '../shared/connection';
import { Constants } from '../config/constants';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};


@Injectable({
  providedIn: 'root'
})
export class VantageService {


  constructor(private http: HttpClient) { }

  rootURL = 'http://localhost:3000';

  public getDatabases(connection: Connection): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http.post(this.rootURL + '/api/databases', body, httpOptions)
      .pipe(
        retry(1),
        catchError((error) => this.handleError(error))
      );;
  }

  public getTables(connection: Connection, dbName: String): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http.post(this.rootURL + '/api/databases/' + dbName + '/tables', body, httpOptions)
      .pipe(
        retry(1),
        catchError((error) => this.handleError(error))
      );;
  }

  public getColumns(connection: Connection, dbName: String, tableName: String): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http.post(this.rootURL + '/api/databases/' + dbName + '/tables/' + tableName + '/columns', body, httpOptions)
      .pipe(
        retry(1),
        catchError((error) => this.handleError(error))
      );;
  }


  public init(connection: Connection, db: String, basetable: String, col: String): Observable<any> {
    let body = { ...connection, db, basetable, col }
    console.log(body);
    return this.http.post(this.rootURL + '/api/vantage/init', body, httpOptions)
      .pipe(
        retry(1),
        catchError((error) => this.handleError(error))
      );;

  }

  handleError(erroResp: HttpErrorResponse): Observable<any> {
    return throwError(() => erroResp.error);
  }
}
