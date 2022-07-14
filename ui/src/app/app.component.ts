import { Component, OnInit } from '@angular/core';
import { AppService } from './service/common/app.service';
import { Constants } from './config/constants';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = Constants.TitleOfSite;
  stages:String[] = [];

  constructor(private appService:AppService){
  }

  ngOnInit(): void {
    this.appService.getStages().subscribe(stages => this.stages = stages)
  }

}
