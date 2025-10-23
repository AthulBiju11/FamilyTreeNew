import React, { useEffect, useRef, useState } from "react";
import * as d3 from 'd3';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';
import familyData from './family_data.json';

function filterFamily(data, parentId) {
  // The filter method creates a new array with all elements that pass the test implemented by the provided function.
  return data.filter(person => {
    // We include the person in the new array if:
    // 1. Their own 'id' matches the parentId (this includes the parent themselves).
    // 2. Their 'rels.parents' array contains the parentId (this includes all their children).
    return person.id === parentId || (person.rels && person.rels.parents && person.rels.parents.includes(parentId));
  });
}

export default function FamilyTree() {
  const containerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Add reset function to global scope for debugging
  useEffect(() => {
    window.resetFamilyTreeData = () => {
      localStorage.removeItem('familyTreeData');
      console.log('Data reset to original');
      window.location.reload();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const initializeChart = () => {
      // Assume user_type is available in this scope
      const user_type = 'user'; // or 'admin'
    
      // Clean up any existing chart
      if (chartInstanceRef.current) {
        d3.select('#FamilyChart').selectAll('*').remove();
        chartInstanceRef.current = null;
      }
    
      
      // Check for saved data in localStorage
      let initialData = familyData;
      let new_data = familyData.filter(item => item.data.UNID == "10");

      console.log("new_data",new_data)

      // console.log(initialData)

      try {
        const savedData = localStorage.getItem('familyTreeData');
        if (savedData) {
          initialData = JSON.parse(savedData);
          console.log('Loaded data from localStorage');
        }
      } catch (error) {
          console.error('Error loading data from localStorage:', error);
        }
    
      // const f3Chart = f3.createChart('#FamilyChart', new_data)
      const f3Chart = f3.createChart('#FamilyChart', initialData)
        .setTransitionTime(1000)
        .setCardXSpacing(250)
        .setCardYSpacing(150);
    
      chartInstanceRef.current = f3Chart;
    
    
      const f3EditTree = f3Chart.editTree()
        .fixed(true)
        .setFields(["first name","last name","birthday","anniversary","mobile_no","whatsapp_number","achievements","profession","address","death_date","nick_name"])
        .setEditFirst(false)
        .setOnChange(() => {
          // This will only be called by admins
          const updatedData = f3EditTree.getStoreDataCopy();
          console.log('Data changed, saving to localStorage:', updatedData);
          
          try {
            localStorage.setItem('familyTreeData', JSON.stringify(updatedData));
            console.log('Data saved to localStorage');
          } catch (error) {
            console.error('Error saving data to localStorage:', error);
          }
          
          setTimeout(() => {
            window.location.reload();
          }, 500);
        })
        .setOnFormCreation((props) => {
          if (user_type === 'user') {
            const formContainer = props.cont;

            // 1. Change the title to "Person Details"
            const titleElement = formContainer.querySelector('.f3-edit-form-title');
            if (titleElement) {
              titleElement.textContent = 'Person Details';
            }

            // 2. Make all input fields read-only
            const inputs = formContainer.querySelectorAll('input, textarea');
            inputs.forEach(input => {
              input.readOnly = true;
              input.style.border = 'none';
              input.style.backgroundColor = 'transparent';
              input.style.color = 'inherit';
            });

            // 3. Hide all action buttons
            
            // *** THIS IS THE CORRECTED PART ***
            // Hide the "Update" button
            const submitButton = formContainer.querySelector('.f3-edit-form-submit-btn');
            if (submitButton) submitButton.style.display = 'none';

            // Hide the "Add Relative" button
            const addRelativeButton = formContainer.querySelector('.f3-add-relative-btn');
            if (addRelativeButton) addRelativeButton.style.display = 'none';

            // Hide the "Remove Person" button
            const removePersonButton = formContainer.querySelector('.f3-edit-form-delete-btn');
            if(removePersonButton) removePersonButton.style.display = 'none';
          }
        });
    
      // Conditionally remove on-card edit/add icons for non-admins
      if (user_type !== 'admin') {
        f3EditTree.setNoEdit();
      }
      
      f3EditTree.setEdit();
      
      const f3Card = f3Chart.setCardHtml()
        .setOnCardUpdate(function(d) {
          if (d.data._new_rel_data) return;
          if (f3EditTree.isRemovingRelative()) return;
    
          const cardElement = this;
          d3.select(cardElement).select('.card').style('cursor', 'pointer'); 
          const card = cardElement.querySelector('.card-inner');
          
          d3.select(card).style('position', 'relative');
          
          d3.select(card).selectAll('.f3-svg-circle-hover').remove();

          if (user_type === 'admin') {
            const editButtonDiv = d3.select(card)
              .append('div')
              .attr('class', 'f3-svg-circle-hover edit-button')
              .attr('style', 'cursor: pointer; width: 20px; height: 20px; position: absolute; top: 5px; right: 5px; z-index: 1000;')
              .html(f3.icons.userEditSvgIcon());
            
            editButtonDiv.select('svg').style('padding', '0');
            
            const addButtonDiv = d3.select(card)
              .append('div')
              .attr('class', 'f3-svg-circle-hover add-button')
              .attr('style', 'cursor: pointer; width: 20px; height: 20px; position: absolute; top: 5px; right: 30px; z-index: 1000;')
              .html(f3.icons.userPlusSvgIcon());
            
            addButtonDiv.select('svg').style('padding', '0');
            
            const editButton = editButtonDiv.node();
            const addButton = addButtonDiv.node();
            
            const editHandler = (e) => {
              e.stopPropagation();
              f3EditTree.open(d.data);
            };

            const addHandler = (e) => {
              e.stopPropagation();
              f3EditTree.open(d.data);
              setTimeout(() => document.querySelector('.f3-add-relative-btn').click(), 50);
            };

            editButton.addEventListener('click', editHandler);
            addButton.addEventListener('click', addHandler);
          }
        });
    
      f3Card.setOnCardClick((e, d) => {
        if (user_type === 'user') {
          f3EditTree.setNoEdit().open(d.data);
          return;
        }
    
        if (f3EditTree.isAddingRelative() || f3EditTree.isRemovingRelative()) {
          f3EditTree.closeForm();
        } else {
          f3EditTree.open(d.data);
        }
      });
      
      f3Chart.updateTree({initial: true});
      setIsInitialized(true);
    };

    const timer = setTimeout(initializeChart, 100);
    
    return () => {
      clearTimeout(timer);
      if (chartInstanceRef.current) {
        d3.select('#FamilyChart').selectAll('*').remove();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      className="f3" 
      id="FamilyChart" 
      ref={containerRef} 
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        backgroundColor: 'rgb(33,33,33)',
        color: '#fff'
      }}
    />
  );
}