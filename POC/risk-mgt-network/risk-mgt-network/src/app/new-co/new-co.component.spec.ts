import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NewCoComponent } from './new-co.component';

describe('NewCoComponent', () => {
  let component: NewCoComponent;
  let fixture: ComponentFixture<NewCoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NewCoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewCoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
