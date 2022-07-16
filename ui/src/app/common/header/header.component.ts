import { Component, OnInit } from '@angular/core';
import { AppService } from 'src/app/service/common/app.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  isConnectionPage:boolean = false;
  isDataPrepPage:boolean = false;
  constructor(private appService:AppService) { }

  ngOnInit(): void {
    this.appService.connectionPage.subscribe({
      next: (isConnectionPage) => (this.isConnectionPage = isConnectionPage)
    });
    this.appService.dataprepPage.subscribe({
      next: (isDataPrepPage) => (this.isDataPrepPage = isDataPrepPage)
    })

  }

}
