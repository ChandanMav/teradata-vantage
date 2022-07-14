import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, Observable, retry, Subject, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { Connection } from '../shared/connection';
import { Constants } from '../config/constants';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root',
})
export class ServerConnectionService {
  constructor(private http: HttpClient) {}
  rootURL = 'http://localhost:3000';

  public testServerConnection(connection: Connection): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http
      .post(this.rootURL+ '/api/connection', body, httpOptions)
      .pipe(
        retry(1),
        catchError((error) => this.handleError(error))
      );
  }

  handleError(erroResp: HttpErrorResponse): Observable<any> {
    let errorMsg: string = 'An error occured. Please try after sometime!';
    return throwError(() => erroResp.error.message || errorMsg);
  }
}
