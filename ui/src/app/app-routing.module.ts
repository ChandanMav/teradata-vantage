import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHomeComponent } from './app-home/app-home.component';
import { ConnectionComponent } from './connection/connection.component';
import { DataPreperationComponent } from './data-preperation/data-preperation.component';
import { VantageHomeComponent } from './vantage-home/vantage-home.component';

const routes: Routes = [
  {path: '', component: AppHomeComponent, pathMatch: 'full'},
  {path: 'connection', component: ConnectionComponent},
  {path:'mdlbuild', component: DataPreperationComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
