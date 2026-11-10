import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Station1 } from './station1';

describe('Station1', () => {
  let component: Station1;
  let fixture: ComponentFixture<Station1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Station1],
    }).compileComponents();

    fixture = TestBed.createComponent(Station1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
