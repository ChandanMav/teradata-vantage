import { Injectable } from '@angular/core';
import { GlobalConstants } from '../../global-constants';
import { BehaviorSubject, Observable, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  constructor() {}

  getStages(): Observable<String[]> {
    return new Observable((observer) => {
      setInterval(() => {
        observer.next(GlobalConstants.stages);
      }, 10);
    });
  }

  connectionPage = new BehaviorSubject<boolean>(false);
  dataprepPage = new BehaviorSubject<boolean>(false);

  rootURL = 'http://localhost:3000';

  handleError(erroResp: HttpErrorResponse): Observable<any> {
    return throwError(() => erroResp.error);
  }


}
