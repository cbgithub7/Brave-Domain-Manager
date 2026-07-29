:: run_unit_tests.bat
@echo off
echo Running all test scripts for domain_manager_gui...
python -m unittest test_domain_manager_gui_part1.py
python -m unittest test_domain_manager_gui_part2.py
python -m unittest test_domain_manager_gui_part3.py
python -m unittest test_domain_manager_gui_part4.py
echo All tests completed.
pause
