import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { AppService } from './common/app.service';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(private http: HttpClient, private appService: AppService) { }

  upload(file: any): Observable<any> {
    // Create form data
    const formData = new FormData();
    // Store form name as "file" with file data
    formData.append("config", file);

    return this.http.post(this.appService.rootURL + "/api/uploadappconfig", formData)
      .pipe(catchError((error) => this.appService.handleError(error))
      );
  }
}
