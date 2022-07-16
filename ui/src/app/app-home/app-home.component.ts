import { Component, OnInit } from '@angular/core';
import { AppService } from '../service/common/app.service';

@Component({
  selector: 'app-app-home',
  templateUrl: './app-home.component.html',
  styleUrls: ['./app-home.component.css']
})
export class AppHomeComponent implements OnInit {

  constructor(private appService:AppService) { }

  ngOnInit(): void {
    this.appService.connectionPage.next(false);
    this.appService.dataprepPage.next(false);
  }

}
