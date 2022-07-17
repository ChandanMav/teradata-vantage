import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError, Observable, retry, Subject, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { Connection } from '../shared/connection';
import { Constants } from '../config/constants';
import { AppService } from './common/app.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root',
})
export class ServerConnectionService {
  constructor(private http: HttpClient, private appService: AppService) {}
  rootURL = this.appService.rootURL;

  public testServerConnection(connection: Connection): Observable<any> {
    let body = JSON.stringify(connection);
    return this.http
      .post(this.rootURL+ '/api/connection', body, httpOptions)
      .pipe(
        retry(1),
        catchError((error) => this.appService.handleError(error))
      );
  }

}
