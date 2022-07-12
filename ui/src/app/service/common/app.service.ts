import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConstants } from '../../global-constants';

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
}
