import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHomeComponent } from './app-home/app-home.component';
import { ConnectionComponent } from './connection/connection.component';
import { DataPreperationComponent } from './data-preperation/data-preperation.component';
import { VantageHomeComponent } from './vantage-home/vantage-home.component';

const routes: Routes = [
  {path: '', component: AppHomeComponent, pathMatch: 'full'},
  {path: 'vantage', component: VantageHomeComponent,
    children : [
      { path: '', component: ConnectionComponent , pathMatch: 'full' },
      {
        path:'dataprep', component: DataPreperationComponent
      }

    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
