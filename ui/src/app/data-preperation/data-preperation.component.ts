import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VantageService } from '../service/vantage.service';
import { Connection } from '../shared/connection';

@Component({
  selector: 'app-data-preperation',
  templateUrl: './data-preperation.component.html',
  styleUrls: ['./data-preperation.component.css']
})
export class DataPreperationComponent implements OnInit {
  config: Connection;
  databases: String[] = ["--Please Select Database--"];
  tables: String[] = ["--Please Select Tables--"];
  columns: String[] = ["--Please Select Columns--"];

  selectedDb: String;
  selectedtable: String;
  selectedColumn: String;


  constructor(private router: Router, private activatedRoute: ActivatedRoute, private vantageService: VantageService) { }

  ngOnInit(): void {
    let state = history.state;
    delete state["navigationId"];
    this.config = state;

    //console.log(this.config);
    this.vantageService.getDatabases(this.config).subscribe({
      next: response => {
        //console.log(response);
        this.databases = response.databases;
      },
      error: error => {
        //console.log(error);
        if (error.error_code === "No_database_Session") {
          this.router.navigate(['/connection'], {
            relativeTo: this.activatedRoute,
          });
        }
      }
    })
  }

  changeDropdown(x: any, type: String) {

    switch (type) {
      case "database":
        this.selectedDb = x.value;
        this.tables = ["--Please Select Tables--"];
        this.columns = ["--Please Select Columns--"];
        this.selectedtable = "";
        this.selectedColumn= "";
        this.vantageService.getTables(this.config, this.selectedDb).subscribe({
          next: response => {
            // console.log(response);
            this.tables = response.tables;
          },
          error: error => {
            //console.log(error);
            if (error.error_code === "No_database_Session") {
              this.router.navigate(['/connection'], {
                relativeTo: this.activatedRoute,
              });
            }
          }
        })
        break;
      case "table":
        this.selectedtable = x.value;
        this.columns = ["--Please Select Columns--"];
        this.selectedColumn= "";

        this.vantageService.getColumns(this.config, this.selectedDb, this.selectedtable).subscribe({
          next: response => {
            //console.log(response);
            this.columns = response.colums;
          },
          error: error => {
            //console.log(error);
            if (error.error_code === "No_database_Session") {
              this.router.navigate(['/connection'], {
                relativeTo: this.activatedRoute,
              });
            }
          }
        })
        break;
      case "column":
        this.selectedColumn = x.value;
        break;
    }
  }

  init = () => {
    this.vantageService.init(this.config, this.selectedDb, this.selectedtable, this.selectedColumn).subscribe({
      next: response => {
        console.log(response);
      },
      error: error => {
        //console.log(error);
        if (error.error_code === "No_database_Session") {
          this.router.navigate(['/connection'], {
            relativeTo: this.activatedRoute,
          });
        }
      }
    })
  }

}
